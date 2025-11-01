export const options = {
  processing: true, 
  scrollX: false,
  responsive: true,
  autoWidth: true,
  language: {
    emptyTable: `
      <div class="text-center pt-3">
        <span class="icon">info</span>
        <p>No records available</p>
      </div>
    `,
    zeroRecords: `
      <div class="text-center pt-3">
        <span class="icon">search_off</span>
        <p>No matching records found.</p>
      </div>
    `,
    processing: `
        <p class="mt-2">Loading Records</p>
    `,
    paginate: {
        first: '<span class="material-symbols-rounded">keyboard_double_arrow_left</span>',
        previous: '<span class="material-symbols-rounded">keyboard_arrow_left</span>',
        next: '<span class="material-symbols-rounded">keyboard_arrow_right</span>',
        last: '<span class="material-symbols-rounded">keyboard_double_arrow_right</span>'
    },
  },
};