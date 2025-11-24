import React from 'react';

const SettingsPanel = ({ topP, setTopP, temperature, setTemperature, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Model Settings</h3>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <label htmlFor="temperature" className="text-sm text-gray-400">Temperature: {temperature}</label>
                    <span className="text-xs text-gray-500">Creativity</span>
                </div>
                <input
                    type="range"
                    id="temperature"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-600">
                    <span>Precise (0.0)</span>
                    <span>Creative (2.0)</span>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <label htmlFor="topP" className="text-sm text-gray-400">Top P: {topP}</label>
                    <span className="text-xs text-gray-500">Diversity</span>
                </div>
                <input
                    type="range"
                    id="topP"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-600">
                    <span>Focused (0.0)</span>
                    <span>Diverse (1.0)</span>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
