from django.urls import path
from .views import (
    LoginView,
    RegisterView,
    RecordListCreateView,
    RecordDetailView,
    AnalyticsSummaryView,
    legacy_page_view
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("records/", RecordListCreateView.as_view(), name="record-list-create"),
    path("records/<int:pk>/", RecordDetailView.as_view(), name="record-detail"),
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path("legacy/", legacy_page_view, name="legacy-page"),
]