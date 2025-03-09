useEffect(() => {
  if (experts.length > 0) {
    // Ändern von [...new Set()] zu Array.from() für bessere Kompatibilität
    const domains = Array.from(new Set(experts.map(expert => expert.domain)));
    setAvailableDomains(domains);
  }
}, [experts]); 