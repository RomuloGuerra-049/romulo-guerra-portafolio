const isLocalPreview = ["localhost", "127.0.0.1"].includes(
  window.location.hostname,
);

export const apiBase =
  isLocalPreview && window.location.port !== "3000"
    ? `http://${window.location.hostname}:3000`
    : "";

export function apiUrl(path) {
  return `${apiBase}${path}`;
}

export const fetchCredentials = apiBase ? "include" : "same-origin";
