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
    }
  })
}

// 🔹 NEW: Close Loading
export function closeLoading() {
  Swal.close()
}