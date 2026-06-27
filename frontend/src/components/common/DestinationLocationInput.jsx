/**
 * DestinationLocationInput.jsx
 * Thin semantic wrapper around LocationAutocomplete for destination locations.
 *
 * Usage:
 *   <DestinationLocationInput
 *     value={destinationLocation}
 *     onChange={setDestinationLocation}
 *     error={errors.destination}
 *     required
 *   />
 */

import React, { forwardRef } from 'react';
import LocationAutocomplete from './LocationAutocomplete';

const DestinationLocationInput = forwardRef(function DestinationLocationInput(
    {
        value,
        onChange,
        error,
        required = false,
        disabled = false,
        label = 'Destination',
        placeholder = 'Where are you headed?',
        autoFocus = false,
        className = '',
        id,
    },
    ref
) {
    return (
        <LocationAutocomplete
            ref={ref}
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            label={label}
            icon="destination"
            error={error}
            disabled={disabled}
            autoFocus={autoFocus}
            required={required}
            className={className}
        />
    );
});

export default DestinationLocationInput;