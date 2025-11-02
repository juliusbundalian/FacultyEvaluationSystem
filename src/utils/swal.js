import Swal from 'sweetalert2'

// 1. Unsaved changes
export function confirmUnsavedChanges() {
  return Swal.fire({
    title: 'Unsaved Changes',
    text: 'You have unsaved changes. Are you sure you want to leave without saving?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#ff3e1d',
    cancelButtonColor: '#8592a3',
  })
}

// 2. Duplicate entry
export function showDuplicateEntry() {
  return Swal.fire({
    title: 'Duplicate Entry',
    text: 'One or more fields contain values that already exist. Please review your input and try again.',
    icon: 'warning',
    confirmButtonText: 'Review Input',
    confirmButtonColor: '#0000AE',
  })
}

// 3. Confirm logout
export function confirmLogout() {
  return Swal.fire({
    title: 'Confirm Logout',
    text: 'Are you sure you want to logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0000AE',
    cancelButtonColor: '#8592a3',
  })
}

// 4. Save changes
export function confirmSaveChanges() {
  return Swal.fire({
    title: 'Save Changes',
    text: 'Do you want to save the changes you made?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0000AE',
    cancelButtonColor: '#6c757d',
  })
}

// 5. Changes saved
export function showChangesSaved() {
  return Swal.fire({
    title: 'Changes Saved',
    text: 'Your changes have been saved successfully.',
    icon: 'success',
    confirmButtonText: 'Done',
    confirmButtonColor: '#0000AE',
  })
}

// 6. Confirm delete
export function confirmDelete() {
  return Swal.fire({
    title: 'Confirm Delete',
    text: 'Are you sure you want to delete this item? This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#ff3e1d',
    cancelButtonColor: '#8592a3',
  })
}

// 7. Item deleted
export function showItemDeleted() {
  return Swal.fire({
    title: 'Item Deleted',
    text: 'The item has been deleted successfully.',
    icon: 'success',
    confirmButtonText: 'Done',
    confirmButtonColor: '#0000AE',
  })
}

// 8. Loading Swal
export function showLoading(message = 'Saving...') {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

// 🔹 NEW: Close Loading
export function closeLoading() {
  Swal.close()
}

// 9. CSV Import Validation Error
export function showCSVValidationError(message) {
  return Swal.fire({
    title: 'CSV Validation Error',
    text: message,
    icon: 'error',
    confirmButtonText: 'Review File',
    confirmButtonColor: '#0000AE',
  })
}

// 10. CSV Import Success Summary
export function showImportSuccess(summary) {
  return Swal.fire({
    title: 'Import Completed',
    text: 'Data has been successfully imported to the system.',
    icon: 'success',
    confirmButtonText: 'Done',
    confirmButtonColor: '#0000AE',
    width: '500px',
  })
}

// 11. Confirm CSV Import
export function confirmCSVImport(validCount, invalidCount = 0, type = 'records') {
  const message =
    invalidCount > 0
      ? `Import ${validCount} valid ${type}?\n\n${invalidCount} invalid rows will be skipped.`
      : `Import ${validCount} ${type}?`

  return Swal.fire({
    title: 'Confirm Import',
    text: message,
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'Import',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0000AE',
    cancelButtonColor: '#8592a3',
  })
}

// 12. CSV File Error
export function showFileError(message) {
  return Swal.fire({
    title: 'File Error',
    text: message,
    icon: 'error',
    confirmButtonText: 'Try Again',
    confirmButtonColor: '#0000AE',
  })
}

// 13. Authentication Required
export function showAuthRequired() {
  return Swal.fire({
    title: 'Authentication Required',
    text: 'You must be signed in to import data. Please sign in and try again.',
    icon: 'warning',
    confirmButtonText: 'Understood',
    confirmButtonColor: '#0000AE',
  })
}

// 14. Import Failed Error
export function showImportError(errorMessage) {
  return Swal.fire({
    title: 'Import Failed',
    text: `Import operation failed: ${errorMessage}`,
    icon: 'error',
    confirmButtonText: 'Try Again',
    confirmButtonColor: '#0000AE',
  })
}
