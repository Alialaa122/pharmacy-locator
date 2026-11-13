
const endpoint =
  "https://overpass.nextgis.com/my-tCOjTwtH9vNzoB45YiiXwypiUnJOOBnE/api/interpreter";

const query = `
[out:json][timeout:25];

(
  way["building"](around:500,31.2001,29.9187);
  way["landuse"](around:500,31.2001,29.9187);

  way["amenity"](around:500,31.2001,29.9187);
  node["amenity"](around:500,31.2001,29.9187);

  node["highway"="bus_stop"](around:500,31.2001,29.9187);

  way["highway"](around:500,31.2001,29.9187);
);

out geom;
`;

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "PharmacyLocator/1.0",
    },
    body: new URLSearchParams({ data: query }),
  });

  console.log("Status:", response.status);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();

  console.log("Elements:", data.elements?.length);
  console.log("Remark:", data.remark ?? "No errors");
} catch (error) {
  console.error("Overpass error:", error.message);
}
