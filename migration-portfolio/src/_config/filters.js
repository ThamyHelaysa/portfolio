export default {
  formatYear: function () {
    return new Date().getFullYear();
  },

  formatDateFull: function (inputDate) {
    const date = new Date(inputDate);

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  },
}