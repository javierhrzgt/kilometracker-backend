/**
 * Utilidades de cálculo de eficiencia de combustible.
 * Centraliza la lógica compartida entre los endpoints:
 *   - GET /api/vehicles/:alias/fuel-efficiency
 *   - GET /api/vehicles/:alias/stats
 *   - GET /api/vehicles/:alias/analytics
 */

const LITROS_POR_GALON = 3.78541;

/**
 * Calcula km/litro a partir de distancia total y galones totales.
 * @param {number} totalDistancia - Kilómetros recorridos
 * @param {number} totalGalones   - Galones cargados
 * @returns {number} km por litro (2 decimales), 0 si no hay datos
 */
function calcKmPorLitro(totalDistancia, totalGalones) {
  if (totalGalones <= 0) return 0;
  return parseFloat((totalDistancia / (totalGalones * LITROS_POR_GALON)).toFixed(2));
}

/**
 * Calcula km/galón.
 * @param {number} totalDistancia
 * @param {number} totalGalones
 * @returns {number}
 */
function calcKmPorGalon(totalDistancia, totalGalones) {
  if (totalGalones <= 0) return 0;
  return parseFloat((totalDistancia / totalGalones).toFixed(2));
}

/**
 * Calcula costo por kilómetro.
 * @param {number} totalCosto      - Suma de gastos
 * @param {number} totalDistancia  - Kilómetros recorridos
 * @returns {number} costo por km (3 decimales), 0 si no hay datos
 */
function calcCostoPorKm(totalCosto, totalDistancia) {
  if (totalDistancia <= 0) return 0;
  return parseFloat((totalCosto / totalDistancia).toFixed(3));
}

/**
 * Calcula el resumen completo de eficiencia a partir de arrays de rutas y recargas.
 * @param {Array} routes  - Documentos de Route con campo distanciaRecorrida
 * @param {Array} refuels - Documentos de Refuel con campos galones y cantidadGastada
 * @returns {{ kmPorLitro, kmPorGalon, costoPorKm, totalDistancia, totalGalones, totalGastoCombustible }}
 */
function calcEfficiencySummary(routes, refuels) {
  const totalDistancia = routes.reduce((s, r) => s + r.distanciaRecorrida, 0);
  const totalGalones = refuels.reduce((s, r) => s + (r.galones || 0), 0);
  const totalGastoCombustible = refuels.reduce((s, r) => s + r.cantidadGastada, 0);

  return {
    kmPorLitro: calcKmPorLitro(totalDistancia, totalGalones),
    kmPorGalon: calcKmPorGalon(totalDistancia, totalGalones),
    costoPorKm: calcCostoPorKm(totalGastoCombustible, totalDistancia),
    totalDistancia: parseFloat(totalDistancia.toFixed(2)),
    totalGalones: parseFloat(totalGalones.toFixed(4)),
    totalGastoCombustible: parseFloat(totalGastoCombustible.toFixed(2)),
  };
}

module.exports = {
  LITROS_POR_GALON,
  calcKmPorLitro,
  calcKmPorGalon,
  calcCostoPorKm,
  calcEfficiencySummary,
};
