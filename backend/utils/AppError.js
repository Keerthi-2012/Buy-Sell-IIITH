// An error that carries an HTTP status; the error handler turns it into a JSON response.
export class AppError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra; // optional extra fields merged into the response body
  }
}
