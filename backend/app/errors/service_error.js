/**
 * Custom error class for service-layer errors.
 * Carries an HTTP status code so controllers can respond without string-matching.
 */
export default class ServiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}
