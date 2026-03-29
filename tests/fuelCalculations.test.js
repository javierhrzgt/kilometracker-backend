/**
 * Pruebas matemáticas para fuelCalculations.js.
 * Usa valores conocidos para verificar resultados exactos.
 */
const {
  LITROS_POR_GALON,
  calcKmPorLitro,
  calcKmPorGalon,
  calcCostoPorKm,
  calcEfficiencySummary,
} = require('../utils/fuelCalculations');

describe('fuelCalculations', () => {
  describe('LITROS_POR_GALON', () => {
    it('should be 3.78541', () => {
      expect(LITROS_POR_GALON).toBe(3.78541);
    });
  });

  describe('calcKmPorLitro', () => {
    it('should calculate correctly: 378.541 km / 10 gal = 10.00 km/L', () => {
      // 10 galones * 3.78541 L/gal = 37.8541 litros
      // 378.541 km / 37.8541 L = 10.00 km/L
      const result = calcKmPorLitro(378.541, 10);
      expect(result).toBe(10.00);
    });

    it('should return 0 when galones is 0', () => {
      expect(calcKmPorLitro(500, 0)).toBe(0);
    });

    it('should return 0 when galones is negative', () => {
      expect(calcKmPorLitro(500, -5)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // 100 km / (5 gal * 3.78541 L/gal) = 100 / 18.92705 = 5.28 km/L
      const result = calcKmPorLitro(100, 5);
      expect(result).toBe(5.28);
    });

    it('should handle small distances correctly', () => {
      const result = calcKmPorLitro(10, 1);
      // 10 / 3.78541 = 2.64 km/L
      expect(result).toBe(2.64);
    });
  });

  describe('calcKmPorGalon', () => {
    it('should calculate correctly: 300 km / 10 gal = 30 km/gal', () => {
      expect(calcKmPorGalon(300, 10)).toBe(30.00);
    });

    it('should return 0 when galones is 0', () => {
      expect(calcKmPorGalon(300, 0)).toBe(0);
    });

    it('should return 0 when galones is negative', () => {
      expect(calcKmPorGalon(300, -1)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // 100 / 3 = 33.33
      expect(calcKmPorGalon(100, 3)).toBe(33.33);
    });
  });

  describe('calcCostoPorKm', () => {
    it('should calculate correctly: Q200 / 400 km = Q0.500 per km', () => {
      expect(calcCostoPorKm(200, 400)).toBe(0.5);
    });

    it('should return 0 when distance is 0', () => {
      expect(calcCostoPorKm(100, 0)).toBe(0);
    });

    it('should return 0 when distance is negative', () => {
      expect(calcCostoPorKm(100, -10)).toBe(0);
    });

    it('should round to 3 decimal places', () => {
      // Q100 / 300 km = 0.333 per km
      expect(calcCostoPorKm(100, 300)).toBe(0.333);
    });
  });

  describe('calcEfficiencySummary', () => {
    it('should return all zeros when arrays are empty', () => {
      const result = calcEfficiencySummary([], []);
      expect(result.kmPorLitro).toBe(0);
      expect(result.kmPorGalon).toBe(0);
      expect(result.costoPorKm).toBe(0);
      expect(result.totalDistancia).toBe(0);
      expect(result.totalGalones).toBe(0);
      expect(result.totalGastoCombustible).toBe(0);
    });

    it('should aggregate distancia from multiple routes', () => {
      const routes = [
        { distanciaRecorrida: 100 },
        { distanciaRecorrida: 150 },
        { distanciaRecorrida: 200 },
      ];
      const result = calcEfficiencySummary(routes, []);
      expect(result.totalDistancia).toBe(450);
    });

    it('should aggregate galones and gasto from multiple refuels', () => {
      const refuels = [
        { galones: 5, cantidadGastada: 50 },
        { galones: 10, cantidadGastada: 100 },
      ];
      const result = calcEfficiencySummary([], refuels);
      expect(result.totalGalones).toBe(15);
      expect(result.totalGastoCombustible).toBe(150);
    });

    it('should compute full efficiency correctly with known values', () => {
      // 4 routes: 100+150+200+300 = 750 km
      // 2 refuels: 10+10 = 20 gal, Q100+Q100 = Q200
      // km/L = 750 / (20 * 3.78541) = 750 / 75.7082 = 9.91 km/L
      // km/gal = 750 / 20 = 37.5
      // costo/km = 200 / 750 = 0.267
      const routes = [
        { distanciaRecorrida: 100 },
        { distanciaRecorrida: 150 },
        { distanciaRecorrida: 200 },
        { distanciaRecorrida: 300 },
      ];
      const refuels = [
        { galones: 10, cantidadGastada: 100 },
        { galones: 10, cantidadGastada: 100 },
      ];
      const result = calcEfficiencySummary(routes, refuels);

      expect(result.totalDistancia).toBe(750);
      expect(result.totalGalones).toBe(20);
      expect(result.totalGastoCombustible).toBe(200);
      expect(result.kmPorGalon).toBe(37.5);
      expect(result.kmPorLitro).toBe(9.91);
      expect(result.costoPorKm).toBe(0.267);
    });

    it('should treat missing galones field as 0', () => {
      const routes = [{ distanciaRecorrida: 100 }];
      const refuels = [{ cantidadGastada: 50 }]; // no galones field
      const result = calcEfficiencySummary(routes, refuels);
      expect(result.totalGalones).toBe(0);
      expect(result.kmPorLitro).toBe(0);
      expect(result.kmPorGalon).toBe(0);
    });
  });
});
