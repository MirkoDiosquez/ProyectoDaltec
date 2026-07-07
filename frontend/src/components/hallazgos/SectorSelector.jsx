/**
 * SectorSelector - Component for selecting sector with conditional subseccion
 * Phase 3 T036: Dropdown for sectors, conditional subseccion dropdown for INTERNO
 */
import React, { useState, useEffect } from 'react';
import { useCatalogoContext } from '../../context/CatalogoContext';
import './SectorSelector.css';

const SectorSelector = ({
  sectorCodigo,
  subseccionCodigo,
  onSectorChange,
  onSubseccionChange,
  disabled = false,
}) => {
  const { sectors, getSubseccionesBySetor } = useCatalogoContext();
  const [subsecciones, setSubsecciones] = useState([]);

  // Update subsecciones when sector changes
  useEffect(() => {
    if (sectorCodigo) {
      const subs = getSubseccionesBySetor(sectorCodigo);
      setSubsecciones(subs);
      
      // Clear subseccion if sector is not INTERNO
      if (sectorCodigo !== 'INTERNO' && subseccionCodigo) {
        onSubseccionChange(null);
      }
    }
  }, [sectorCodigo, getSubseccionesBySetor, subseccionCodigo, onSubseccionChange]);

  const showSubseccion = sectorCodigo === 'INTERNO';

  return (
    <div className="sector-selector">
      <div className="form-group">
        <label htmlFor="sector_codigo">Sector *</label>
        <select
          id="sector_codigo"
          value={sectorCodigo || ''}
          onChange={(e) => onSectorChange(e.target.value || null)}
          disabled={disabled}
          required
          className="form-control"
        >
          <option value="">Selecciona un sector</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.codigo}>
              {sector.nombre}
            </option>
          ))}
        </select>
      </div>

      {showSubseccion && (
        <div className="form-group">
          <label htmlFor="subseccion_codigo">Subsección *</label>
          <select
            id="subseccion_codigo"
            value={subseccionCodigo || ''}
            onChange={(e) => onSubseccionChange(e.target.value || null)}
            disabled={disabled}
            required
            className="form-control"
          >
            <option value="">Selecciona una subsección</option>
            {subsecciones.map((subseccion) => (
              <option key={subseccion.id} value={subseccion.codigo}>
                {subseccion.nombre}
              </option>
            ))}
          </select>
          {subsecciones.length === 0 && sectorCodigo === 'INTERNO' && (
            <small className="text-danger">No hay subsecciones disponibles</small>
          )}
        </div>
      )}
    </div>
  );
};

export default SectorSelector;
