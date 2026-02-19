/**
 * Centralized API Service
 * Handles authentication, token management, and secure API requests
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async parseJsonResponse(response) {
    const text = await response.text();
    const trimmed = text.trim();

    if (!trimmed) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        console.error("Failed to parse JSON:", trimmed);
        return trimmed;
      }
    }

    return trimmed;
  }

  /**
   * Decode JWT token payload
   * @param {string} token - JWT token
   * @returns {object|null} Decoded payload or null if invalid
   */
  decodeToken(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired or invalid
   */
  isTokenExpired(token) {
    if (!token) return true;

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    // Check if token has expired (exp is in seconds, Date.now() is in milliseconds)
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Get valid token from storage, returns null if expired
   * @returns {string|null} Valid token or null
   */
  getToken() {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      console.warn("Token has expired, clearing authentication");
      this.clearAuth();
      return null;
    }

    return token;
  }

  /**
   * Store authentication token and extract role
   * @param {string} token - JWT token to store
   */
  setToken(token) {
    localStorage.setItem("token", token);

    // Extract and store role from token
    const decoded = this.decodeToken(token);
    if (decoded?.role) {
      localStorage.setItem("role", decoded.role);
    }

    // Set authenticated flag for backward compatibility
    localStorage.setItem("authenticated", "true");
  }

  /**
   * Clear all authentication data
   */
  clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("authenticated");
  }

  /**
   * Get role from storage
   * @returns {string|null} User role or null
   */
  getRole() {
    return localStorage.getItem("role");
  }

  /**
   * Check if user is authenticated with valid token
   * @returns {boolean} True if authenticated with valid token
   */
  isAuthenticated() {
    return this.getToken() !== null;
  }

  /**
   * Get default headers for authenticated requests
   * @returns {object} Headers object with token
   */
  getAuthHeaders() {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["x-access-token"] = token;
    }

    return headers;
  }

  /**
   * Handle response errors and automatically clear auth on 401/403
   * @param {Response} response - Fetch response object
   * @param {object} options - Options for error handling
   * @returns {Response} Original response if OK
   * @throws {Error} If response is not OK
   */
  async handleResponse(response, options = {}) {
    const { autoRedirect = false, router = null } = options;

    const buildError = (message, data) => {
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      return err;
    };

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.warn(`Authentication error: ${response.status}, clearing tokens`);
      this.clearAuth();

      if (autoRedirect && router) {
        const authType = options.authType || "user";
        const redirectPath = authType === "operator" ? "/admin" : "/login";
        router.push(redirectPath);
      }

      // Try to get error message from response
      try {
        const errorData = await this.parseJsonResponse(response);
        if (typeof errorData === "string" && errorData.trim()) {
          throw buildError(errorData, errorData);
        }
        throw buildError(
          errorData?.error || errorData?.message || "Authentication failed",
          errorData,
        );
      } catch {
        throw buildError("Authentication failed", null);
      }
    }

    if (!response.ok) {
      try {
        const errorData = await this.parseJsonResponse(response);
        console.log("Error response data:", errorData);
        if (typeof errorData === "string" && errorData.trim()) {
          throw buildError(errorData, errorData);
        }
        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          `HTTP error ${response.status}`;
        console.log("Extracted error message:", errorMessage);
        throw buildError(errorMessage, errorData);
      } catch (error) {
        console.log("Error in handleResponse:", error);
        // If error already has the right properties, re-throw it
        if (error.status && error.message) {
          throw error;
        }
        // Otherwise, create a generic error
        throw buildError(`HTTP error ${response.status}`, null);
      }
    }

    return response;
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint (relative to base URL)
   * @param {object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async get(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error("No valid authentication token");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
      ...options,
    });

    await this.handleResponse(response, options);
    return this.parseJsonResponse(response);
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint (relative to base URL)
   * @param {object} data - Request body data
   * @param {object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async post(endpoint, data, options = {}) {
    const token = this.getToken();
    if (!token && !options.skipAuth) {
      throw new Error("No valid authentication token");
    }

    const headers = options.skipAuth
      ? { "Content-Type": "application/json" }
      : this.getAuthHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      ...options,
    });

    await this.handleResponse(response, options);
    return this.parseJsonResponse(response);
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint (relative to base URL)
   * @param {object} data - Request body data
   * @param {object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async put(endpoint, data, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error("No valid authentication token");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      ...options,
    });

    await this.handleResponse(response, options);
    return this.parseJsonResponse(response);
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint (relative to base URL)
   * @param {object} options - Additional options
   * @returns {Promise<any>} Response data
   */
  async delete(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error("No valid authentication token");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
      ...options,
    });

    await this.handleResponse(response, options);
    return this.parseJsonResponse(response);
  }

  /**
   * Make a request with custom headers (e.g., for file uploads)
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async customRequest(endpoint, options = {}) {
    const token = this.getToken();
    if (!token && !options.skipAuth) {
      throw new Error("No valid authentication token");
    }

    // Merge token header if not skipping auth
    if (!options.skipAuth) {
      options.headers = {
        ...options.headers,
        "x-access-token": token,
      };
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    await this.handleResponse(response, options);
    return response;
  }
}

// Export singleton instance
export default new ApiService();
