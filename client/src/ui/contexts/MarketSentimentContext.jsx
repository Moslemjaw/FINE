import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MarketSentimentContext = createContext({
  score: 50,
  gaugeScore: 50,
  label: 'Neutral',
  isRedAlert: false,
  articles: [],
  loading: true,
  refresh: () => {},
});

export function MarketSentimentProvider({ children }) {
  const [data, setData] = useState({
    score: 50, gaugeScore: 50, label: 'Neutral',
    isRedAlert: false, articles: [], loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/news/sentiment', { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setData({
          score: json.average ?? 0,
          gaugeScore: json.gaugeScore ?? 50,
          label: json.label ?? 'Neutral',
          isRedAlert: json.isRedAlert ?? false,
          articles: json.items ?? [],
          loading: false,
        });
      }
    } catch {
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, [refresh]);

  return (
    <MarketSentimentContext.Provider value={{ ...data, refresh }}>
      {children}
    </MarketSentimentContext.Provider>
  );
}

export function useMarketSentiment() {
  return useContext(MarketSentimentContext);
}
