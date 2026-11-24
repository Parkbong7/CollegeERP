exports.getAcademicYears = async (req, res) => {
  res.json({
    data: [
      { id: 'AY_2026_27', name: '2026-2027', isCurrent: true, startDate: '2026-07-01', endDate: '2027-06-30' },
      { id: 'AY_2025_26', name: '2025-2026', isCurrent: false, startDate: '2025-07-01', endDate: '2026-06-30' }
    ]
  });
};
