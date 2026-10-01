import React, { useState } from 'react';

const Console = ({
    isOpen,
    onClose,
    output,
    isRunning,
    status,
    executionTime,
    compiler,
    onClear,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyOutput = () => {
        const text = output?.stdout || output?.stderr || output?.output || '';
        if (text) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`ideTerminalDrawer ${isExpanded ? 'expanded' : ''}`}>
            {/* Terminal Header Bar */}
            <div className="terminalHeaderBar">
                <div className="terminalTitleSection">
                    <div className="terminalTitleIconBadge">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 17 10 11 4 5" />
                            <line x1="12" y1="19" x2="20" y2="19" />
                        </svg>
                    </div>
                    <span className="terminalMainTitle">TERMINAL</span>
                    {status && (
                        <span
                            className={`terminalStatusPulse ${
                                status === 'running'
                                    ? 'running'
                                    : status === 'success'
                                    ? 'success'
                                    : 'error'
                            }`}
                        />
                    )}
                </div>

                <div className="terminalActionsGroup">
                    {isRunning && (
                        <div className="terminalRunningChip">
                            <span className="terminalSpinDot" />
                            <span>Running...</span>
                        </div>
                    )}

                    {!isRunning && executionTime !== null && (
                        <span className="terminalMetricChip">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" className="metricBoltIcon">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            <span>{executionTime} ms</span>
                        </span>
                    )}

                    {!isRunning && status && (
                        <span className={`terminalExitBadge ${status}`}>
                            <span className="terminalExitDot" />
                            <span className="terminalExitText">{status === 'success' ? 'Exit 0' : 'Exit 1'}</span>
                        </span>
                    )}

                    {compiler && !isRunning && (
                        <span className="terminalCompilerTag">
                            {compiler.replace(/\s*\([^)]*\)/g, '').trim() || compiler}
                        </span>
                    )}

                    {/* Copy Output */}
                    <button
                        className="terminalIconBtn"
                        onClick={handleCopyOutput}
                    >
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>

                    {/* Clear Terminal */}
                    <button
                        className="terminalIconBtn"
                        onClick={onClear}
                    >
                        Clear
                    </button>

                    {/* Large, clearly visible Expand / Restore Full Height Icon Button */}
                    <button
                        className="terminalIconBtn expandToggleBtn"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="4 14 10 14 10 20" />
                                <polyline points="20 10 14 10 14 4" />
                                <line x1="14" y1="10" x2="21" y2="3" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 3 21 3 21 9" />
                                <polyline points="9 21 3 21 3 15" />
                                <line x1="21" y1="3" x2="14" y2="10" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                        )}
                    </button>

                    {/* Close Terminal */}
                    <button
                        className="terminalIconBtn close"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Terminal Body Content */}
            <div className="terminalBodyContent">
                <div className="terminalOutputStream">
                    {isRunning ? (
                        <div className="terminalLoadingState">
                            <div className="terminalSpinner" />
                            <p>Executing...</p>
                        </div>
                    ) : output ? (
                        <div className="terminalOutputText">
                            <div className="terminalPromptLine">
                                <span className="promptUser">guest@codesync</span>
                                <span className="promptColon">:</span>
                                <span className="promptPath">~/workspace</span>
                                <span className="promptDollar">$</span>
                                <span className="promptCmd">run</span>
                            </div>

                            {output.stdout && (
                                <pre className="terminalPre stdoutStream">{output.stdout}</pre>
                            )}

                            {output.stderr && (
                                <pre className="terminalPre stderrStream">{output.stderr}</pre>
                            )}

                            {!output.stdout && !output.stderr && output.output && (
                                <pre className="terminalPre stdoutStream">{output.output}</pre>
                            )}
                        </div>
                    ) : (
                        <div className="terminalEmptyPrompt">
                            <span className="promptIcon">⚡</span>
                            <p>Click <strong>Run</strong> in the top toolbar to execute your code.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Console;
