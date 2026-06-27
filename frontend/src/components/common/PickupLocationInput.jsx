/**
 * PickupLocationInput.jsx
 * Thin semantic wrapper around LocationAutocomplete for pickup locations.
 *
 * Usage:
 *   <PickupLocationInput
 *     value={pickupLocation}     // full location object or null
 *     onChange={setPickupLocation}
 *     error={errors.pickup}
 *     required
 *   />
 */

import React, { forwardRef } from 'react';
import LocationAutocomplete from './LocationAutocomplete';

const PickupLocationInput = forwardRef(function PickupLocationInput(
    {
        value,
        onChange,
        error,
        required = false,
        disabled = false,
        label = 'Pickup location',
        placeholder = 'Where are you starting from?',
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
            icon="pickup"
            error={error}
            disabled={disabled}
            autoFocus={autoFocus}
            required={required}
            className={className}
        />
    );
});

export default PickupLocationInput;