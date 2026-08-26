import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, CheckSquare, MessageSquare, ChevronRight } from 'lucide-react';
import './SearchPage.css';

export const SearchPage: React.FC = () => {
  const { workspace } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState(query);
  const [results, setResults] = useState<any>({ meetings: [], transcriptSegments: [], actionItems: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workspace?.id && query.trim()) {
      executeSearch();
    }
  }, [workspace?.id, query]);

  const executeSearch = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/search?workspaceId=${workspace?.id}&q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      setSearchParams({ q: inputQuery.trim() });
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="search-highlight-text">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="page-container-medium">
      <div>
        <h1 className="dashboard-banner-title" style={{ fontSize: '1.75rem' }}>Global Search</h1>
        <p className="dashboard-banner-subtitle">
          Search across meeting titles, speaker transcripts, AI summaries, and action items.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="card search-page-input-card">
        <div className="input-with-icon-wrapper">
          <Search size={20} className="input-left-icon" />
          <input
            type="text"
            placeholder="Search keywords, e.g. 'payment integration', 'API docs'..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="form-input-full"
            style={{ paddingLeft: '44px', height: '48px', fontSize: '1rem' }}
          />
        </div>
      </form>

      {loading ? (
        <div className="card skeleton" style={{ height: '300px' }} />
      ) : !query ? (
        <div className="card recorder-card">
          <div className="recorder-subtitle">
            Type a search term above to search across your workspace meetings.
          </div>
        </div>
      ) : (
        <div className="meetings-list-stack" style={{ gap: '1.75rem' }}>
          {results.meetings?.length > 0 && (
            <div>
              <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                <FileText size={18} color="var(--color-primary)" /> Matching Meetings ({results.meetings.length})
              </h3>
              <div className="meetings-list-stack">
                {results.meetings.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/meetings/${m.id}`)}
                    className="card card-hover action-item-row"
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <h4 className="speaker-name-title">{highlightMatch(m.title, query)}</h4>
                      <p className="meeting-card-desc" style={{ margin: 0 }}>
                        {m.summary?.overview ? highlightMatch(m.summary.overview, query) : 'Meeting details'}
                      </p>
                    </div>
                    <ChevronRight size={18} color="var(--color-primary)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.transcriptSegments?.length > 0 && (
            <div>
              <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                <MessageSquare size={18} color="#f2ae30" /> Transcript Snippets ({results.transcriptSegments.length})
              </h3>
              <div className="meetings-list-stack">
                {results.transcriptSegments.map((seg: any) => (
                  <div
                    key={seg.id}
                    onClick={() => navigate(`/meetings/${seg.transcript.meeting.id}`)}
                    className="card card-hover"
                    style={{ cursor: 'pointer', padding: '1rem 1.25rem' }}
                  >
                    <div className="pro-widget-title" style={{ marginBottom: '4px' }}>
                      From: {seg.transcript.meeting.title} · {seg.speakerName}
                    </div>
                    <p className="segment-text-content">
                      "{highlightMatch(seg.text, query)}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.actionItems?.length > 0 && (
            <div>
              <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                <CheckSquare size={18} color="#3B82F6" /> Action Items ({results.actionItems.length})
              </h3>
              <div className="meetings-list-stack">
                {results.actionItems.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/meetings/${task.meeting.id}`)}
                    className="card card-hover action-item-row"
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div className="speaker-name-title" style={{ marginBottom: '2px' }}>
                        {highlightMatch(task.task, query)}
                      </div>
                      <div className="meeting-card-date">
                        From: {task.meeting.title} · Assignee: {task.assigneeName || 'Unassigned'}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--color-primary)" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
