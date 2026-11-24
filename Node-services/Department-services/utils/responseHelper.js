function successResponse(res, data = null, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

function errorResponse(res, message = 'An error occurred', status = 500, details = null) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      status,
      details
    }
  });
}

module.exports = {
  successResponse,
  errorResponse
};
