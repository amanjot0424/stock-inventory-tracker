import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './Auth';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [records, setRecords] = useState([]);

  // Analytics summary states
  const [totalValuation, setTotalValuation] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
  const [avgPrice, setAvgPrice] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Search filter
  const [searchText, setSearchText] = useState('');

  // Alerts & loading
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states (No SKU field, simple ID only)
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [status, setStatus] = useState('In Stock');
  const [description, setDescription] = useState('');

  let isAdmin = false;
  if (currentUser && currentUser.role === 'Admin') {
    isAdmin = true;
  }

  // Automatic status calculation based on quantity
  function getStatusFromQuantity(qtyVal) {
    if (qtyVal === '' || isNaN(qtyVal)) {
      return 'In Stock';
    }
    const num = Number(qtyVal);
    if (num <= 0) {
      return 'Out of Stock';
    } else if (num <= 10) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  }

  useEffect(function () {
    if (currentUser !== null) {
      loadRecords();
      loadAnalytics();
    }
  }, [currentUser]);

  function loadRecords() {
    setIsLoading(true);
    axios.get('http://127.0.0.1:8000/api/records/', {
      headers: {
        'X-User-Id': currentUser ? currentUser.id : ''
      }
    })
      .then(function (response) {
        setRecords(response.data);
        setIsLoading(false);
      })
      .catch(function (error) {
        setErrorMessage('Could not load records from backend.');
        setIsLoading(false);
      });
  }

  function loadAnalytics() {
    axios.get('http://127.0.0.1:8000/api/analytics/summary/', {
      headers: {
        'X-User-Id': currentUser ? currentUser.id : ''
      }
    })
      .then(function (response) {
        setTotalValuation(response.data.total_valuation || 0);
        setTotalUnits(response.data.total_units || 0);
        setAvgPrice(response.data.avg_unit_price || 0);
        setLowStockCount(response.data.low_stock_count || 0);
      })
      .catch(function (error) {
        console.log('Error loading analytics:', error);
      });
  }

  function clearForm() {
    setEditId(null);
    setName('');
    setCategory('Electronics');
    setQuantity('');
    setUnitPrice('');
    setStatus('In Stock');
    setDescription('');
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    setMessage('');
    setErrorMessage('');

    if (name.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }
    if (quantity === '' || Number(quantity) < 0) {
      setErrorMessage('Quantity cannot be negative.');
      return;
    }
    if (unitPrice === '' || Number(unitPrice) < 0) {
      setErrorMessage('Unit price cannot be negative.');
      return;
    }
    if (description.trim().length < 5) {
      setErrorMessage('Description must be at least 5 characters.');
      return;
    }

    const calculatedStatus = getStatusFromQuantity(quantity);

    const payload = {
      name: name,
      category: category,
      quantity: parseInt(quantity),
      unit_price: parseFloat(unitPrice),
      status: calculatedStatus,
      description: description
    };

    const headers = { 'X-User-Id': currentUser.id };

    if (editId !== null) {
      axios.put('http://127.0.0.1:8000/api/records/' + editId + '/', payload, { headers: headers })
        .then(function () {
          setMessage('Item updated successfully!');
          clearForm();
          loadRecords();
          loadAnalytics();
        })
        .catch(function () {
          setErrorMessage('Failed to update record.');
        });
    } else {
      axios.post('http://127.0.0.1:8000/api/records/', payload, { headers: headers })
        .then(function () {
          setMessage('New item created successfully!');
          clearForm();
          loadRecords();
          loadAnalytics();
        })
        .catch(function () {
          setErrorMessage('Failed to create record.');
        });
    }
  }

  function handleEditClick(item) {
    setEditId(item.id);
    setName(item.name);
    setCategory(item.category);
    setQuantity(item.quantity);
    setUnitPrice(item.unit_price);
    setStatus(getStatusFromQuantity(item.quantity));
    setDescription(item.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeleteClick(id) {
    if (!window.confirm('Are you sure you want to delete item #' + id + '?')) return;

    axios.delete('http://127.0.0.1:8000/api/records/' + id + '/', {
      headers: { 'X-User-Id': currentUser.id }
    })
      .then(function () {
        setMessage('Item deleted successfully.');
        loadRecords();
        loadAnalytics();
      })
      .catch(function () {
        setErrorMessage('Could not delete record.');
      });
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem('user');
  }

  if (currentUser === null) {
    return <Auth onLoginSuccess={setCurrentUser} />;
  }

  // Filter items by name or integer ID
  const filteredRecords = records.filter(function (item) {
    const matchName = item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchId = String(item.id).includes(searchText);
    return matchName || matchId;
  });

  return (
    <div className="container py-4">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="mb-0">Stock & Inventory Tracker</h2>
          <small className="text-muted">
            Logged in as: <strong>{currentUser.name}</strong> ({currentUser.username}) &bull;{' '}
            <span className={isAdmin ? 'badge bg-danger' : 'badge bg-secondary'}>
              {isAdmin ? 'Admin' : 'User'}
            </span>
          </small>
        </div>
        <div>
          <a
            href="http://127.0.0.1:8000/api/legacy/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline-secondary btn-sm me-2"
          >
            Backend Page &rarr;
          </a>
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
            Logout
          </button>
        </div>
      </div>

      {errorMessage !== '' && <div className="alert alert-danger py-2">{errorMessage}</div>}
      {message !== '' && <div className="alert alert-success py-2">{message}</div>}

      {/* Analytics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white p-3">
            <small>Total Valuation</small>
            <h3>₹{Number(totalValuation).toLocaleString()}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-dark text-white p-3">
            <small>Total Units</small>
            <h3>{totalUnits}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-dark p-3">
            <small>Average Price</small>
            <h3>₹{avgPrice}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark p-3">
            <small>Low Stock Alerts</small>
            <h3>{lowStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Admin Add/Edit Form */}
      {isAdmin ? (
        <div className="card mb-4">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <strong>{editId !== null ? ('Edit Item #' + editId) : 'Add New Item'}</strong>
            {editId !== null && (
              <button className="btn btn-sm btn-secondary" onClick={clearForm}>
                Cancel Edit
              </button>
            )}
          </div>
          <div className="card-body">
            <form onSubmit={handleFormSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Item Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={function (e) { setName(e.target.value); }}
                    placeholder="e.g. Wireless Mouse"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={function (e) { setCategory(e.target.value); }}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small">Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    value={quantity}
                    onChange={function (e) {
                      const val = e.target.value;
                      setQuantity(val);
                      setStatus(getStatusFromQuantity(val));
                    }}
                    placeholder="e.g. 50"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={unitPrice}
                    onChange={function (e) { setUnitPrice(e.target.value); }}
                    placeholder="e.g. 19.99"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small">Status (Auto-calculated)</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={status}
                    disabled
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small">Description</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    value={description}
                    onChange={function (e) { setDescription(e.target.value); }}
                    placeholder="Item details..."
                  ></textarea>
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary">
                    {editId !== null ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="alert alert-secondary mb-4">
          You are logged in as a regular user. You can browse stock and analytics, but only administrators can add or edit records.
        </div>
      )}

      {/* Catalog Table displaying ID */}
      <div className="card shadow-sm">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <strong>Inventory Records</strong>
          <input
            type="text"
            className="form-control form-control-sm w-auto"
            placeholder="Search by ID or Name..."
            value={searchText}
            onChange={function (e) { setSearchText(e.target.value); }}
          />
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-4">Loading data...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-4 text-muted">No items found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                    {isAdmin && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(function (item) {
                    let badgeClass = 'badge bg-success';
                    if (item.quantity === 0) {
                      badgeClass = 'badge bg-danger';
                    } else if (item.quantity <= 10) {
                      badgeClass = 'badge bg-warning text-dark';
                    }

                    return (
                      <tr key={item.id}>
                        <td><strong>#{item.id}</strong></td>
                        <td>
                          <div>{item.name}</div>
                          <small className="text-muted">{item.description}</small>
                        </td>
                        <td><span className="badge bg-light text-dark border">{item.category}</span></td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.unit_price).toFixed(2)}</td>
                        <td>
                          <span className={badgeClass}>{item.status}</span>
                        </td>
                        {isAdmin && (
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={function () { handleEditClick(item); }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={function () { handleDeleteClick(item.id); }}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;