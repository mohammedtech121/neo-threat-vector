// nasa.js
const NASA_API_KEY = 'DEMO_KEY'; // Replace with your own key for live demos

async function fetchNEOData() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    const neos = data.near_earth_objects[today];
    if (!neos || neos.length === 0) return getMockNEOs();

    return neos.map(neo => {
      const minDia = neo.estimated_diameter.meters.estimated_diameter_min;
      const maxDia = neo.estimated_diameter.meters.estimated_diameter_max;
      const diameter = (minDia + maxDia) / 2;
      const velocity = parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_hour);
      const miss = parseFloat(neo.close_approach_data[0].miss_distance.kilometers);

      // Map real size to pixel radius (15–50)
      const pixelRadius = Math.min(50, Math.max(15, diameter / 10));
      // Map velocity to fall speed (1–4)
      const fallSpeed = 1 + (velocity / 40000) * 3;

      return {
        name: neo.name.replace(/[\(\)]/g, ''),
        radius: pixelRadius,
        speed: Math.min(4, fallSpeed),
        missDistance: miss,
      };
    });
  } catch (err) {
    console.warn('NASA API error, using mock data:', err);
    return getMockNEOs();
  }
}

function getMockNEOs() {
  // Famous asteroids as fallback
  return [
    { name: 'Apophis', radius: 38, speed: 2.2, missDistance: 31000 },
    { name: 'Bennu', radius: 25, speed: 1.5, missDistance: 430000 },
    { name: 'Eros', radius: 23, speed: 1.8, missDistance: 27000000 },
    { name: 'Itokawa', radius: 33, speed: 2.1, missDistance: 5800000 },
    { name: 'Ryugu', radius: 42, speed: 2.8, missDistance: 7200000 },
  ];
}