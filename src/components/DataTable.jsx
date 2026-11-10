import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, ArrowRight } from 'lucide-react';
import RiskBadge from './RiskBadge';
import ProvenanceBadge from './ProvenanceBadge';

export default function DataTable({
  pipelines = [],
  onRowClick = null,
  showSearch = true,
  showFilters = true,
  defaultFilter = 'ALL',
  itemsPerPage = 10,
  title = null,
  compact = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState(defaultFilter);
  const [filterProvenance, setFilterProvenance] = useState('ALL');
  const [sortField, setSortField] = useState('Calculated_Risk_Score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // default high to low
    }
  };

  // Filtered and sorted data
  const processedData = useMemo(() => {
    return pipelines
      .filter((item) => {
        // Search filter
        const matchesSearch =
          String(item.Pipeline_ID).toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(item.Location).toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(item.Material).toLowerCase().includes(searchTerm.toLowerCase());

        // Level filter
        const level = item.Calculated_Risk_Level || item.Risk_Level;
        const matchesLevel = filterLevel === 'ALL' || level === filterLevel;

        // Provenance filter
        const prov = item.Provenance || (item.Is_Synthetic ? 'SYNTHETIC_DEMO' : 'ENGINEER_SUBMITTED');
        const matchesProv = filterProvenance === 'ALL' || prov === filterProvenance;

        return matchesSearch && matchesLevel && matchesProv;
      })
      .sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Fallbacks
        if (sortField === 'Calculated_Risk_Score') {
          aVal = a.Calculated_Risk_Score ?? (a.Risk_Level === 'HIGH' ? 85 : a.Risk_Level === 'MEDIUM' ? 55 : 20);
          bVal = b.Calculated_Risk_Score ?? (b.Risk_Level === 'HIGH' ? 85 : b.Risk_Level === 'MEDIUM' ? 55 : 20);
        }

        if (typeof aVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortOrder === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
      });
  }, [pipelines, searchTerm, filterLevel, filterProvenance, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSortIcon = (field) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Table Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        {title && (
          <h3 className="text-base font-bold text-slate-800 shrink-0">
            {title}
          </h3>
        )}

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search bar */}
          {showSearch && (
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ID, Location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition"
              />
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setFilterLevel(lvl);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md transition ${
                    filterLevel === lvl
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}

          {/* Provenance Filter */}
          {showFilters && (
            <select
              value={filterProvenance}
              onChange={(e) => {
                setFilterProvenance(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            >
              <option value="ALL">All Sources</option>
              <option value="OFFICIAL_SOURCE">Official GIS Only</option>
              <option value="ENGINEER_SUBMITTED">Engineer Verified Only</option>
              <option value="SYNTHETIC_DEMO">Synthetic / Demo Only</option>
            </select>
          )}
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th
                onClick={() => handleSort('Pipeline_ID')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Pipeline ID</span>
                  {getSortIcon('Pipeline_ID')}
                </div>
              </th>
              <th className="py-3 px-4">Provenance</th>
              <th
                onClick={() => handleSort('Location')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Location</span>
                  {getSortIcon('Location')}
                </div>
              </th>
              <th
                onClick={() => handleSort('Age_Years')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none text-right sm:text-left"
              >
                <div className="flex items-center gap-1">
                  <span>Age</span>
                  {getSortIcon('Age_Years')}
                </div>
              </th>
              <th
                onClick={() => handleSort('Material')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none hidden md:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Material</span>
                  {getSortIcon('Material')}
                </div>
              </th>
              <th
                onClick={() => handleSort('Previous_Leaks')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Prev. Leaks</span>
                  {getSortIcon('Previous_Leaks')}
                </div>
              </th>
              <th
                onClick={() => handleSort('Condition_Score')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Condition</span>
                  {getSortIcon('Condition_Score')}
                </div>
              </th>
              <th
                onClick={() => handleSort('Calculated_Risk_Score')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/50 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Risk Score</span>
                  {getSortIcon('Calculated_Risk_Score')}
                </div>
              </th>
              <th className="py-3 px-4">Risk Level</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => {
                const score = item.Calculated_Risk_Score ?? (item.Risk_Level === 'HIGH' ? 88 : item.Risk_Level === 'MEDIUM' ? 52 : 22);
                const level = item.Calculated_Risk_Level || item.Risk_Level || 'LOW';

                return (
                  <tr
                    key={item.Pipeline_ID}
                    onClick={() => onRowClick && onRowClick(item.Pipeline_ID)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-bold text-blue-900 whitespace-nowrap">
                      {item.Pipeline_ID}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ProvenanceBadge size="xs" provenance={item.Provenance} sourceName={item.Source_Name} />
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {item.Location}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {item.Age_Years} yrs
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
                      {item.Material}
                    </td>
                    <td className="py-3 px-4 text-slate-700 hidden lg:table-cell">
                      <span className="font-semibold">{item.Previous_Leaks}</span> leaks ({item.Repair_Count} rep)
                    </td>
                    <td className="py-3 px-4 text-slate-700 hidden lg:table-cell">
                      <span className="font-semibold">{item.Condition_Score}</span> / 10
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right">{score}</span>
                        <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <RiskBadge level={level} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRowClick) onRowClick(item.Pipeline_ID);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500">
                  <div className="max-w-xs mx-auto">
                    <p className="text-sm font-semibold">No pipelines match your search or filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the risk level filter or clearing the search text.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-800">
            {processedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-800">
            {Math.min(currentPage * itemsPerPage, processedData.length)}
          </span>{' '}
          of <span className="font-semibold text-slate-800">{processedData.length}</span> pipelines
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
