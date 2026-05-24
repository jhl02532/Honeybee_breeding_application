// MelittaBreed Weather Sensor Simulator
// Simulates micro-climates based on Apiary Geolocation coordinates

const WEATHER_STATUSES = ["Sunny", "Overcast", "Showering", "Windy"];

window.WeatherSimulator = {
  // Simulates telemetry reading for a given coordinates and date
  getTelemetry(latitude, longitude, dateStr = null) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const month = date.getMonth(); // 0 to 11

    // Core temperature model based on latitude and seasonal oscillation (Korea peninsula reference)
    // Summer peaking in July-August, winter bottoming in January
    const baseTemp = 18; // base standard temperature
    const latitudeDeviation = (37.56 - latitude) * 1.5; // south is warmer, north is cooler
    const seasonalFactor = Math.sin(((month - 3) / 12) * 2 * Math.PI); // offset to peak in July
    
    // Calculate final temperature with slight daily noise
    const dailyNoise = (Math.random() - 0.5) * 4; // +/- 2 degrees
    const temperature = Number((baseTemp + (seasonalFactor * 12) + latitudeDeviation + dailyNoise).toFixed(1));

    // Humidity is typically higher in summer and lower in winter/spring
    const baseHumidity = 60;
    const humiditySeasonalFactor = Math.sin(((month - 5) / 12) * 2 * Math.PI); // peak in humid monsoon (July)
    const humidityNoise = Math.floor((Math.random() - 0.5) * 20); // +/- 10%
    let humidity = Math.floor(baseHumidity + (humiditySeasonalFactor * 15) + humidityNoise);
    humidity = Math.max(15, Math.min(100, humidity)); // clamp between 15% and 100%

    // Select weather status based on humidity and random factors
    let weatherStatus = "Sunny";
    if (humidity > 85) {
      weatherStatus = "Showering";
    } else if (humidity > 70) {
      weatherStatus = "Overcast";
    } else if (Math.random() > 0.8) {
      weatherStatus = "Windy";
    } else if (Math.random() > 0.6) {
      weatherStatus = "Overcast";
    }

    // Mock ambient particulate index (important for pollen/propolis collection)
    const pm25 = Math.max(5, Math.floor(25 + (Math.random() - 0.5) * 15));

    return {
      temperature,
      humidity,
      weatherStatus,
      pm25,
      timestamp: date.toISOString()
    };
  },

  // Generates complete weather summary statistics across standard months for chart data
  getApiaryMonthlyAverages(latitude, longitude) {
    const monthlyAverages = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    months.forEach((m, idx) => {
      // Mock static date for the middle of each month
      const tempSum = [];
      const humidSum = [];
      
      // Sample 5 days to average
      for (let day = 5; day <= 25; day += 5) {
        const tele = this.getTelemetry(latitude, longitude, `2026-${String(idx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        tempSum.push(tele.temperature);
        humidSum.push(tele.humidity);
      }

      const avgTemp = tempSum.reduce((a, b) => a + b, 0) / tempSum.length;
      const avgHumid = humidSum.reduce((a, b) => a + b, 0) / humidSum.length;

      monthlyAverages.push({
        month: m,
        temperature: Number(avgTemp.toFixed(1)),
        humidity: Number(avgHumid.toFixed(0))
      });
    });

    return monthlyAverages;
  }
};
