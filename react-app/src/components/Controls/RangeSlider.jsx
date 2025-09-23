import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { formatNumber } from '../../utils/formatters';
import './RangeSlider.css';

function RangeSlider({
  min = 0,
  max = 1000000,
  values,
  onChange,
  label,
  step = 1000,
  logarithmic = false
}) {
  const [minValue, setMinValue] = useState(values?.[0] || min);
  const [maxValue, setMaxValue] = useState(values?.[1] || max);
  const [minInput, setMinInput] = useState(String(values?.[0] || min));
  const [maxInput, setMaxInput] = useState(String(values?.[1] || max));
  const [isDragging, setIsDragging] = useState(null);
  const sliderRef = useRef(null);
  const minThumbRef = useRef(null);
  const maxThumbRef = useRef(null);

  useEffect(() => {
    if (values) {
      // Validate input values to ensure min < max
      const validMin = Math.max(min, Math.min(values[0], max - step));
      const validMax = Math.min(max, Math.max(values[1], validMin + step));
      setMinValue(validMin);
      setMaxValue(validMax);
      setMinInput(String(validMin));
      setMaxInput(String(validMax));
    }
  }, [values, min, max, step]);

  // Convert value to position (0-100%)
  const valueToPosition = (value) => {
    if (logarithmic && min > 0) {
      const minLog = Math.log(min);
      const maxLog = Math.log(max);
      const valueLog = Math.log(Math.max(value, min));
      return ((valueLog - minLog) / (maxLog - minLog)) * 100;
    }
    return ((value - min) / (max - min)) * 100;
  };

  // Convert position (0-100%) to value
  const positionToValue = (position) => {
    if (logarithmic && min > 0) {
      const minLog = Math.log(min);
      const maxLog = Math.log(max);
      const valueLog = minLog + (position / 100) * (maxLog - minLog);
      return Math.round(Math.exp(valueLog) / step) * step;
    }
    const value = min + (position / 100) * (max - min);
    return Math.round(value / step) * step;
  };

  const handleMinInputChange = (e) => {
    setMinInput(e.target.value);
  };

  const handleMaxInputChange = (e) => {
    setMaxInput(e.target.value);
  };

  const handleMinInputBlur = () => {
    const value = parseInt(minInput) || 0;
    const newMin = Math.max(min, Math.min(value, maxValue - step));
    setMinValue(newMin);
    setMinInput(String(newMin));
    onChange?.([newMin, maxValue]);
  };

  const handleMaxInputBlur = () => {
    const value = parseInt(maxInput) || max;
    const newMax = Math.min(max, Math.max(value, minValue + step));
    setMaxValue(newMax);
    setMaxInput(String(newMax));
    onChange?.([minValue, newMax]);
  };

  const handleMinInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleMinInputBlur();
    }
  };

  const handleMaxInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleMaxInputBlur();
    }
  };

  const handleMouseDown = (thumb) => (e) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleTouchStart = (thumb) => (e) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const value = positionToValue(position);

    if (isDragging === 'min') {
      // Ensure minimum stays below maximum with at least step difference
      const maxAllowed = maxValue - step;
      const newMin = Math.max(min, Math.min(value, maxAllowed));
      if (newMin !== minValue) {
        setMinValue(newMin);
        setMinInput(String(newMin));
        onChange?.([newMin, maxValue]);
      }
    } else if (isDragging === 'max') {
      // Ensure maximum stays above minimum with at least step difference
      const minAllowed = minValue + step;
      const newMax = Math.min(max, Math.max(value, minAllowed));
      if (newMax !== maxValue) {
        setMaxValue(newMax);
        setMaxInput(String(newMax));
        onChange?.([minValue, newMax]);
      }
    }
  }, [isDragging, minValue, maxValue, min, max, step, onChange, positionToValue]);

  const handleTouchMove = React.useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = sliderRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const value = positionToValue(position);

    if (isDragging === 'min') {
      // Ensure minimum stays below maximum with at least step difference
      const maxAllowed = maxValue - step;
      const newMin = Math.max(min, Math.min(value, maxAllowed));
      if (newMin !== minValue) {
        setMinValue(newMin);
        setMinInput(String(newMin));
        onChange?.([newMin, maxValue]);
      }
    } else if (isDragging === 'max') {
      // Ensure maximum stays above minimum with at least step difference
      const minAllowed = minValue + step;
      const newMax = Math.min(max, Math.max(value, minAllowed));
      if (newMax !== maxValue) {
        setMaxValue(newMax);
        setMaxInput(String(newMax));
        onChange?.([minValue, newMax]);
      }
    }
  }, [isDragging, minValue, maxValue, min, max, step, onChange, positionToValue]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const minPos = valueToPosition(minValue);
  const maxPos = valueToPosition(maxValue);

  return (
    <div className="range-slider-container-enhanced">
      <label className="range-slider-label">{label}</label>

      <div className="range-input-group">
        <div className="range-input-wrapper">
          <Input
            type="number"
            value={minInput}
            onChange={handleMinInputChange}
            onBlur={handleMinInputBlur}
            onKeyPress={handleMinInputKeyPress}
            className="range-input"
            min={min}
            max={maxValue - step}
            step={step}
            placeholder="최소"
          />
        </div>
        <span className="range-separator">~</span>
        <div className="range-input-wrapper">
          <Input
            type="number"
            value={maxInput}
            onChange={handleMaxInputChange}
            onBlur={handleMaxInputBlur}
            onKeyPress={handleMaxInputKeyPress}
            className="range-input"
            min={minValue + step}
            max={max}
            step={step}
            placeholder="최대"
          />
        </div>
      </div>

      <div className="range-slider" ref={sliderRef}>
        <div className="range-slider-track">
          <div
            className="range-slider-selected"
            style={{
              left: `${minPos}%`,
              width: `${maxPos - minPos}%`
            }}
          />
        </div>
        <div
          ref={minThumbRef}
          className="range-slider-thumb range-slider-thumb-min"
          style={{ left: `${minPos}%` }}
          onMouseDown={handleMouseDown('min')}
          onTouchStart={handleTouchStart('min')}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={minValue}
          aria-label={`Minimum ${label}`}
          tabIndex={0}
        >
          <div className="range-slider-thumb-label">
            {formatNumber(minValue)}
          </div>
        </div>
        <div
          ref={maxThumbRef}
          className="range-slider-thumb range-slider-thumb-max"
          style={{ left: `${maxPos}%` }}
          onMouseDown={handleMouseDown('max')}
          onTouchStart={handleTouchStart('max')}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={maxValue}
          aria-label={`Maximum ${label}`}
          tabIndex={0}
        >
          <div className="range-slider-thumb-label">
            {formatNumber(maxValue)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RangeSlider;