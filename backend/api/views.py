from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render

from .storage import (
    find_user_by_credentials,
    get_user_by_id,
    get_all_records,
    get_record_by_id,
    create_record,
    update_record,
    delete_record,
    create_user,
)
from .analytics import calculate_analytics_summary


def authenticate_request(request):
    """Simple header-based lookup without database session."""
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return None
    try:
        return get_user_by_id(int(user_id))
    except (ValueError, TypeError):
        return None


def validate_inventory_payload(data):
    errors = {}
    if not data.get("name") or len(str(data["name"]).strip()) < 2:
        errors["name"] = "Item name must be at least 2 characters."
    if not data.get("description") or len(str(data["description"]).strip()) < 5:
        errors["description"] = "Description must be at least 5 characters."
    try:
        qty = int(data.get("quantity", -1))
        if qty < 0:
            errors["quantity"] = "Quantity must be a non-negative integer."
    except (ValueError, TypeError):
        errors["quantity"] = "Quantity must be an integer."
    try:
        price = float(data.get("unit_price", -1))
        if price < 0.0:
            errors["unit_price"] = "Unit price must be a non-negative number."
    except (ValueError, TypeError):
        errors["unit_price"] = "Unit price must be a valid decimal number."
    return errors


class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        user = find_user_by_credentials(username, password)
        if not user:
            return Response({"error": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "name": user["name"]
            }
        }, status=status.HTTP_200_OK)


class RegisterView(APIView):
    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        name = request.data.get("name", "").strip()
        role = request.data.get("role", "User")

        errors = {}
        if len(username) < 3:
            errors["username"] = "Username must be at least 3 characters long."
        if len(password) < 4:
            errors["password"] = "Password must be at least 4 characters long."
        if role not in ["Admin", "User"]:
            errors["role"] = "Role must be 'Admin' or 'User'."

        if errors:
            return Response({"validation_errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        user, err_msg = create_user(username, password, name, role)
        if err_msg:
            return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "User registered successfully", "user": user}, status=status.HTTP_201_CREATED)


class RecordListCreateView(APIView):
    def get(self, request):
        """ALL authenticated users (Admin and regular Users) can READ all records."""
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Return all records to every user for reading
        return Response(get_all_records(), status=status.HTTP_200_OK)

    def post(self, request):
        """ONLY Admin can CREATE records. All other users are blocked."""
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        # Explicit role check: only Admin can add stock
        if user.get("role") != "Admin":
            return Response(
                {"error": "Access Denied: Standard users have read-only access. Only Admin can create records."},
                status=status.HTTP_403_FORBIDDEN
            )

        errors = validate_inventory_payload(request.data)
        if errors:
            return Response({"validation_errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        new_record = create_record(request.data, user_id=user["id"])
        return Response(new_record, status=status.HTTP_201_CREATED)


class RecordDetailView(APIView):
    def get(self, request, pk):
        """ALL users can VIEW details of a specific record."""
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        record = get_record_by_id(pk)
        if not record:
            return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(record, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """ONLY Admin can EDIT/UPDATE records. All other users are blocked."""
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.get("role") != "Admin":
            return Response(
                {"error": "Access Denied: Standard users have read-only access. Only Admin can update records."},
                status=status.HTTP_403_FORBIDDEN
            )

        record = get_record_by_id(pk)
        if not record:
            return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        errors = validate_inventory_payload(request.data)
        if errors:
            return Response({"validation_errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        updated = update_record(pk, request.data)
        return Response(updated, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        """ONLY Admin can DELETE records. All other users are blocked."""
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.get("role") != "Admin":
            return Response(
                {"error": "Access Denied: Standard users have read-only access. Only Admin can delete records."},
                status=status.HTTP_403_FORBIDDEN
            )

        record = get_record_by_id(pk)
        if not record:
            return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        delete_record(pk)
        return Response({"message": "Record deleted successfully."}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        """Only Admin can delete records."""
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.get("role") != "Admin":
            return Response({"error": "Access Denied: Only Administrators can delete inventory records."}, status=status.HTTP_403_FORBIDDEN)

        record = get_record_by_id(pk)
        if not record:
            return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        delete_record(pk)
        return Response({"message": "Record deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class AnalyticsSummaryView(APIView):
    def get(self, request):
        user = authenticate_request(request)
        if not user:
            return Response({"error": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

        records = get_all_records()
        analytics = calculate_analytics_summary(records)
        return Response(analytics, status=status.HTTP_200_OK)




def legacy_page_view(request):
    return render(request, "legacy_page.html")