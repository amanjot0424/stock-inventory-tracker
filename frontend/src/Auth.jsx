import React, { useState } from 'react';
import axios from 'axios';

function Auth(props) {
    // Simple state variables for form inputs
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('User');

    // Simple messages
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    function handleFormSubmit(e) {
        e.preventDefault();
        setErrorMessage('');

        // Basic validation checks using standard if-else
        if (username.length < 3) {
            setErrorMessage('Username must be at least 3 letters.');
            return;
        }
        if (password.length < 4) {
            setErrorMessage('Password must be at least 4 letters.');
            return;
        }
        if (isRegister && name.length < 2) {
            setErrorMessage('Please enter your full name.');
            return;
        }

        setLoading(true);

        if (isRegister) {
            // Register request
            axios.post('http://127.0.0.1:8000/api/auth/register/', {
                username: username,
                password: password,
                name: name,
                role: role
            })
                .then(function (response) {
                    setLoading(false);
                    // Save user to storage and tell App component we logged in
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    props.onLoginSuccess(response.data.user);
                })
                .catch(function (error) {
                    setLoading(false);
                    if (error.response && error.response.data && error.response.data.error) {
                        setErrorMessage(error.response.data.error);
                    } else {
                        setErrorMessage('Registration failed. Try again.');
                    }
                });
        } else {
            // Login request
            axios.post('http://127.0.0.1:8000/api/auth/login/', {
                username: username,
                password: password
            })
                .then(function (response) {
                    setLoading(false);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    props.onLoginSuccess(response.data.user);
                })
                .catch(function (error) {
                    setLoading(false);
                    if (error.response && error.response.data && error.response.data.error) {
                        setErrorMessage(error.response.data.error);
                    } else {
                        setErrorMessage('Invalid username or password.');
                    }
                });
        }
    }

    function toggleMode() {
        setIsRegister(!isRegister);
        setErrorMessage('');
    }

    return (
        <div className="container" style={{ marginTop: '70px', maxWidth: '400px' }}>
            <div className="card shadow-sm p-4">
                <h3 className="text-center mb-3">
                    {isRegister ? 'Register' : 'Login'}
                </h3>

                {errorMessage !== '' && (
                    <div className="alert alert-danger py-2">{errorMessage}</div>
                )}

                <form onSubmit={handleFormSubmit}>
                    {isRegister && (
                        <div className="mb-3">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={name}
                                onChange={function (e) { setName(e.target.value); }}
                                placeholder="Enter your name"
                            />
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-control"
                            value={username}
                            onChange={function (e) { setUsername(e.target.value); }}
                            placeholder="Enter username"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={function (e) { setPassword(e.target.value); }}
                            placeholder="Enter password"
                        />
                    </div>

                    {isRegister && (
                        <div className="mb-3">
                            <label className="form-label">Account Role</label>
                            <select
                                className="form-select"
                                value={role}
                                onChange={function (e) { setRole(e.target.value); }}
                            >
                                <option value="User">User (Read-Only)</option>
                                <option value="Admin">Admin (Full Access)</option>
                            </select>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Login')}
                    </button>
                </form>

                <div className="text-center mt-3">
                    <button type="button" className="btn btn-link p-0" onClick={toggleMode}>
                        {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                    </button>
                </div>

                <div className="alert alert-light border mt-3 text-center" style={{ fontSize: '12px' }}>
                    <strong>Default logins:</strong><br />
                    admin / admin123<br />
                    user1 / user123
                </div>
            </div>
        </div>
    );
}

export default Auth;