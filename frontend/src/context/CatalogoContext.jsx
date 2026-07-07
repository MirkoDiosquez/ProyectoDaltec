/**
 * CatalogoContext - Manages catalog data (sectors, subsecciones, tipos)
 * Phase 3 T035: Fetch and cache catalog data on app initialization
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client from '../api/client';

const CatalogoContext = createContext(null);

export const CatalogoProvider = ({ children }) => {
  const [catalogs, setCatalogs] = useState({
    sectors: [],
    subsecciones: [],
    tipos: [],
    loading: true,
    error: null,
  });

  // Fetch catalog data
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [sectoresRes, subseccionesRes, tiposRes] = await Promise.all([
          client.get('/catalogos/sectores/'),
          client.get('/catalogos/subsecciones/'),
          client.get('/catalogos/tipos/'),
        ]);

        setCatalogs({
          sectors: sectoresRes.data?.results || sectoresRes.data || [],
          subsecciones: subseccionesRes.data?.results || subseccionesRes.data || [],
          tipos: tiposRes.data?.results || tiposRes.data || [],
          loading: false,
          error: null,
        });
      } catch (err) {
        setCatalogs((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'Error loading catalogs',
        }));
      }
    };

    fetchCatalogs();
  }, []);

  // Get subsecciones for a specific sector
  const getSubseccionesBySetor = useCallback(
    (sectorCodigo) => {
      return catalogs.subsecciones.filter((s) => s.sector.codigo === sectorCodigo);
    },
    [catalogs.subsecciones]
  );

  // Get sector by codigo
  const getSectorByCodigo = useCallback(
    (codigo) => {
      return catalogs.sectors.find((s) => s.codigo === codigo);
    },
    [catalogs.sectors]
  );

  // Get tipo by codigo
  const getTipoByCodigo = useCallback(
    (codigo) => {
      return catalogs.tipos.find((t) => t.codigo === codigo);
    },
    [catalogs.tipos]
  );

  const value = {
    ...catalogs,
    getSubseccionesBySetor,
    getSectorByCodigo,
    getTipoByCodigo,
  };

  return <CatalogoContext.Provider value={value}>{children}</CatalogoContext.Provider>;
};

export const useCatalogoContext = () => {
  const context = useContext(CatalogoContext);
  if (!context) {
    throw new Error('useCatalogoContext must be used within CatalogoProvider');
  }
  return context;
};
