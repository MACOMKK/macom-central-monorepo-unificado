export function buildImportFeedback({ createdCount, errors, successMessage, partialSuccessMessage, emptyMessage }) {
  if (createdCount && errors.length) {
    return {
      type: 'success',
      message: partialSuccessMessage(createdCount, errors),
    };
  }

  if (createdCount) {
    return {
      type: 'success',
      message: successMessage(createdCount),
    };
  }

  return {
    type: 'error',
    message: errors[0] || emptyMessage,
  };
}
