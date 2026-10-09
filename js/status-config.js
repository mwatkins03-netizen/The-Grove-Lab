/* The Grove Lab — submissions open or closed.
   Two ways to control it:
   1. Live switch (recommended): deploy the small Worker in worker/ (see README), paste its URL into `endpoint`,
      then use admin.html with your password to open or close submissions for every visitor.
   2. Without the Worker: leave `endpoint` empty, set `open` to true or false here, and re-upload this file.
   `open` is also the fallback if the Worker can't be reached and this browser has never seen a live status. */
window.GROVE_STATUS_CONFIG = {
  endpoint: "",
  open: true,
};
