export function normalizeOsmElements(elements) {
  // Create lookup Maps once
  const nodesById = createNodesMap(elements);
  const waysById = createWaysMap(elements);

  return elements
    .map((element) => {
      if (element.type === "relation") {
        return normalizeRelation(
          element,
          waysById,
          nodesById
        );
      }

      return normalizeOsmElement(element);
    })
    .filter((element) => element !== null);
}

export function isArea(tags) {
  return Boolean(
    tags.building ||
    tags.landuse ||
    tags.amenity === "school" ||
    tags.amenity === "hospital" ||
    tags.amenity === "university"
  );
}

function createNodesMap(elements) {
  const nodes = elements.filter(
    (element) => element.type === "node"
  );

  return new Map(
    nodes.map((node) => [node.id, node])
  );
}

function getWayCoordinates(way, nodesById) {
  const coordinates = way.nodes.map((nodeId) => {
    const node = nodesById.get(nodeId);

    if (!node) {
      return null;
    }

    return [node.lon, node.lat];
  });

  if (coordinates.includes(null)) {
    return null;
  }

  return coordinates;
}

function createWaysMap(elements) {
  const ways = elements.filter(
    (element) => element.type === "way"
  );

  return new Map(
    ways.map((way) => [way.id, way])
  );
}


function normalizeRelation(relation, waysById, nodesById) {
  if (relation.tags?.type !== "multipolygon") {
    return null;
  }

  const outerMembers = relation.members.filter(
    (member) => member.role === "outer"
  );

    const outerRings = outerMembers.map((member) => {
    const way = waysById.get(member.ref);

    if (!way) {
        return null;
    }

    const coordinates = getWayCoordinates(way, nodesById);

    if (!coordinates || coordinates.length < 4) {
        return null;
    }

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    const isClosed =
        first[0] === last[0] &&
        first[1] === last[1];

    if (!isClosed) {
        return null;
    }

    return coordinates;
    });

    if (outerRings.includes(null) || outerRings.length === 0) {
    return null;
    }
    return {
  id: `relation/${relation.id}`,
  osmType: "relation",
  category: relation.tags?.landuse
    ? "landuse"
    : "unknown",
  geometryType:
    outerRings.length === 1 ? "Polygon" : "MultiPolygon",
  name: relation.tags?.name ?? null,
  tags: relation.tags,
  coordinates:
    outerRings.length === 1
        ? outerRings
        : outerRings.map((ring) => [ring]),
};
}

function getAreaCategory(tags) {
  if (tags.building) return "building";
  if (tags.landuse) return "landuse";
  if (tags.amenity) return "amenity";

  return "unknown";
}


export function normalizeOsmElement(element) {

  // Handle Nodes
  if (element.type === "node") {
    const category = getNodeCategory(element.tags);

    if (!category) {
      return null;
    }

    if (
      !Number.isFinite(element.lat) ||
      !Number.isFinite(element.lon)
    ) {
      return null;
    }

    return {
      id: `${element.type}/${element.id}`,
      osmType: element.type,
      category,
      geometryType: "Point",
      name: element.tags.name ?? null,
      tags: element.tags,
      coordinates: [element.lon, element.lat],
    };
  }

  if (element.type !== "way") {
    return null;
  }

  if (!element.geometry || element.geometry.length < 2) {
    return null;
  }

  const firstPoint = element.geometry[0];
  const lastPoint = element.geometry[element.geometry.length - 1];

  const isClosed =
    firstPoint.lat === lastPoint.lat &&
    firstPoint.lon === lastPoint.lon;

  // Building
  if (isArea(element.tags) && isClosed) {
    return {
      id: `${element.type}/${element.id}`,
      osmType: element.type,
      category: getAreaCategory(element.tags),
      geometryType: "Polygon",
      name: element.tags.name ?? null,
      tags: element.tags,
      coordinates: [
        element.geometry.map((point) => [
          point.lon,
          point.lat,
        ]),
      ],
    };
  }

  // Road
  if (element.tags?.highway && !isClosed) {
    return {
      id: `${element.type}/${element.id}`,
      osmType: element.type,
      category: "road",
      geometryType: "LineString",
      name: element.tags.name ?? null,
      tags: element.tags,
      coordinates: element.geometry.map((point) => [
        point.lon,
        point.lat,
      ]),
    };
  }

  return null;
}



function getNodeCategory(tags) {
  const amenityCategories = [
    "pharmacy",
    "hospital",
    "clinic",
    "school",
    "university",
    "kindergarten",
    "atm",
  ];

  if (amenityCategories.includes(tags?.amenity)) {
    return tags.amenity;
  }

  if (tags?.highway === "bus_stop") {
    return "bus_stop";
  }

  return null;
}


const OVERPASS_URL =
  "https://overpass.nextgis.com/my-tCOjTwtH9vNzoB45YiiXwypiUnJOOBnE/api/interpreter";

export async function fetchOsmData(query) {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    },
    body: new URLSearchParams({
        data: query,
    }),
   });

    if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
        `Overpass Error: ${response.status} - ${errorText}`
    );
    }

  const data = await response.json();

  return data.elements;
}


function buildOverpassQuery(latitude, longitude, radius) {
  return `
    [out:json][timeout:25];

    (
      way["building"](around:${radius},${latitude},${longitude});
      way["landuse"](around:${radius},${latitude},${longitude});

      way["amenity"](around:${radius},${latitude},${longitude});
      node["amenity"](around:${radius},${latitude},${longitude});

      node["highway"="bus_stop"](around:${radius},${latitude},${longitude});

      way["highway"](around:${radius},${latitude},${longitude});
    );

    out geom;
  `;
}


export async function getGeographicFeatures(
  latitude,
  longitude,
  radius
) {
  const query = buildOverpassQuery(
    latitude,
    longitude,
    radius
  );

  const elements = await fetchOsmData(query);

  const features = normalizeOsmElements(elements);

  return features;
}



// const pharmacyNode = {
//   type: "node",
//   id: 789,
//   lat: 31.20,
//   lon: 29.92,
//   tags: {
//     amenity: "pharmacy",
//     name: "Test Pharmacy",
//   },
// };

// const schoolNode = {
//   type: "node",
//   id: 790,
//   lat: 31.21,
//   lon: 29.93,
//   tags: {
//     amenity: "school",
//   },
// };

// const busStopNode = {
//   type: "node",
//   id: 791,
//   lat: 31.22,
//   lon: 29.94,
//   tags: {
//     highway: "bus_stop",
//   },
// };

// console.log(
//   normalizeOsmElements([
//     pharmacyNode,
//     schoolNode,
//     busStopNode,
//   ])
// );



// const mockElements = [
//   {
//     type: "relation",
//     id: 16772110,
//     members: [
//       {
//         type: "way",
//         ref: 1227787417,
//         role: "outer",
//       },
//     ],
//     tags: {
//       landuse: "grass",
//       type: "multipolygon",
//     },
//   },

//   {
//     type: "way",
//     id: 1227787417,
//     nodes: [1, 2, 3, 4, 1],
//   },

//   { type: "node", id: 1, lat: 31.20, lon: 29.91 },
//   { type: "node", id: 2, lat: 31.21, lon: 29.91 },
//   { type: "node", id: 3, lat: 31.21, lon: 29.92 },
//   { type: "node", id: 4, lat: 31.20, lon: 29.92 },
// ];

// let result = normalizeOsmElements(mockElements)

// console.log(result);


// const elements = [
//   {
//     type: "way",
//     id: 123,
//     tags: { building: "yes" },
//     geometry: [
//       { lat: 31.20, lon: 29.92 },
//       { lat: 31.20, lon: 29.93 },
//       { lat: 31.21, lon: 29.93 },
//       { lat: 31.20, lon: 29.92 },
//     ],
//   },
//   {
//     type: "way",
//     id: 456,
//     tags: { highway: "residential" },
//     geometry: [
//       { lat: 31.20, lon: 29.92 },
//       { lat: 31.21, lon: 29.93 },
//     ],
//   },
//   {
//     type: "node",
//     id: 789,
//     tags: { amenity: "pharmacy" },
//     lat: 31.20,
//     lon: 29.92,
//   },
// ];

// console.log(normalizeOsmElements(elements));