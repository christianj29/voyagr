const countries = window.VOYAGR_COUNTRIES || [];

window.initMap = () => {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  countries.forEach((country) => {
    const marker = new google.maps.Marker({
      position: { lat: country.lat, lng: country.lng },
      map,
      title: country.name,
    });

    marker.addListener("click", () => {
      const params = new URLSearchParams({
        code: country.code,
        name: country.name,
      });
      window.location.href = `country.html?${params.toString()}`;
    });
  });
};
