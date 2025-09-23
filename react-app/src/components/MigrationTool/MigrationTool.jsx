import { useState } from 'react';
import DatabaseMigration from '../../services/DatabaseMigration';
import MigrationDiagnostics from '../../services/MigrationDiagnostics';
import './MigrationTool.css';

function MigrationTool({ onMigrationComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('idle');
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    failed: 0,
    percentage: 0
  });
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState(null);

  const handleMigration = async () => {
    if (migrationStatus === 'running') return;

    const confirmMigration = window.confirm(
      'This will import all data from JSON to Supabase. Continue?'
    );

    if (!confirmMigration) return;

    try {
      setMigrationStatus('running');
      setError(null);
      setProgress({ total: 0, processed: 0, failed: 0, percentage: 0 });

      const progressInterval = setInterval(() => {
        const currentProgress = DatabaseMigration.getProgress();
        const percentage = currentProgress.total > 0
          ? Math.round((currentProgress.processed / currentProgress.total) * 100)
          : 0;

        setProgress({
          ...currentProgress,
          percentage
        });

        if (currentProgress.status === 'completed' || currentProgress.status === 'error') {
          clearInterval(progressInterval);
        }
      }, 1000);

      const result = await DatabaseMigration.migrateFromJSON();

      clearInterval(progressInterval);
      setMigrationStatus('completed');
      setProgress({
        ...result,
        percentage: 100
      });

      if (onMigrationComplete) {
        onMigrationComplete();
      }
    } catch (err) {
      console.error('Migration error:', err);
      setMigrationStatus('error');
      setError(err.message);
    }
  };

  const handleSyncLocalStorage = async () => {
    try {
      setMigrationStatus('syncing');

      // Use the new migration diagnostics to migrate tags and statuses
      const result = await MigrationDiagnostics.migrateTagsAndStatuses();

      setMigrationStatus('completed');
      alert(`Synced ${result.tags_migrated} tags and ${result.statuses_migrated} contact statuses successfully!`);

      // Refresh validation if it exists
      if (validationResults) {
        await handleValidation();
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
      setMigrationStatus('error');
    }
  };

  const handleValidation = async () => {
    try {
      setMigrationStatus('validating');
      const results = await DatabaseMigration.validateMigration();
      setValidationResults(results);
      setMigrationStatus('idle');
    } catch (err) {
      console.error('Validation error:', err);
      setError(err.message);
      setMigrationStatus('error');
    }
  };

  const handleClearDatabase = async () => {
    try {
      const cleared = await DatabaseMigration.clearDatabase();
      if (cleared) {
        alert('Database cleared successfully');
        setValidationResults(null);
      }
    } catch (err) {
      console.error('Clear database error:', err);
      setError(err.message);
    }
  };

  const handleFixMissing = async () => {
    try {
      setMigrationStatus('fixing');
      setError(null);

      // First run diagnostics
      const diagnostics = await MigrationDiagnostics.findMissingRecords();
      console.log('Diagnostics:', diagnostics);

      if (diagnostics.missing_records.length === 0) {
        alert('No missing records found!');
        setMigrationStatus('idle');
        return;
      }

      const confirmFix = window.confirm(
        `Found ${diagnostics.missing_records.length} missing records. Fix them now?`
      );

      if (!confirmFix) {
        setMigrationStatus('idle');
        return;
      }

      // Fix missing records
      const fixResult = await MigrationDiagnostics.fixMissingRecords();

      setMigrationStatus('completed');
      alert(`Fixed ${fixResult.fixed} missing records!`);

      // Refresh validation
      await handleValidation();
    } catch (err) {
      console.error('Fix error:', err);
      setError(err.message);
      setMigrationStatus('error');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="migration-tool-toggle"
        title="Database Migration Tool"
      >
        🔄
      </button>
    );
  }

  return (
    <div className="migration-tool-modal">
      <div className="migration-tool-content">
        <div className="migration-tool-header">
          <h2>Database Migration Tool</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="close-btn"
          >
            ×
          </button>
        </div>

        <div className="migration-tool-body">
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {migrationStatus === 'running' && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="progress-text">
                {progress.processed} / {progress.total} ({progress.percentage}%)
                {progress.failed > 0 && ` - Failed: ${progress.failed}`}
              </div>
            </div>
          )}

          {migrationStatus === 'completed' && (
            <div className="success-message">
              ✓ Migration completed successfully!
              <br />
              Processed: {progress.processed} / {progress.total}
              {progress.failed > 0 && (
                <><br />Failed: {progress.failed}</>
              )}
            </div>
          )}

          {validationResults && (
            <div className="validation-results">
              <h3>Validation Results</h3>
              <ul>
                <li>Database records: {validationResults.databaseCount}</li>
                <li>JSON records: {validationResults.jsonCount}</li>
                <li>Tags migrated: {validationResults.tagsCount}</li>
                <li>Contact statuses: {validationResults.statusesCount}</li>
                <li>
                  Status: {validationResults.isValid ? (
                    <span className="valid">✓ Valid</span>
                  ) : (
                    <span className="invalid">✗ Mismatch</span>
                  )}
                </li>
              </ul>
            </div>
          )}

          <div className="migration-actions">
            <button
              onClick={handleMigration}
              disabled={migrationStatus === 'running'}
              className="btn btn-primary"
            >
              {migrationStatus === 'running' ? 'Migrating...' : 'Start Migration'}
            </button>

            <button
              onClick={handleSyncLocalStorage}
              disabled={migrationStatus === 'running'}
              className="btn btn-secondary"
            >
              Sync localStorage
            </button>

            <button
              onClick={handleValidation}
              disabled={migrationStatus === 'running'}
              className="btn btn-secondary"
            >
              Validate Data
            </button>

            <button
              onClick={handleFixMissing}
              disabled={migrationStatus === 'running'}
              className="btn btn-warning"
              style={{ background: '#f59e0b' }}
            >
              Fix Missing Records
            </button>

            <button
              onClick={handleClearDatabase}
              disabled={migrationStatus === 'running'}
              className="btn btn-danger"
            >
              Clear Database
            </button>
          </div>

          <div className="migration-instructions">
            <h4>Instructions:</h4>
            <ol>
              <li>Execute the SQL schema in Supabase SQL Editor first</li>
              <li>Click "Start Migration" to import JSON data</li>
              <li>Click "Sync localStorage" to import tags and statuses</li>
              <li>Click "Validate Data" to verify the migration</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MigrationTool;