'use client'

import { useState } from 'react'
import { PhoneInput as ReactPhoneInput } from 'react-international-phone'

interface Props {
  name: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  className?: string
}

export function PhoneInput({ name, defaultValue = '', placeholder, required, className }: Props) {
  const [value, setValue] = useState(defaultValue)

  return (
    <div className={`w-full ${className ?? ''}`}>
      <ReactPhoneInput
        defaultCountry="fr"
        value={value}
        onChange={setValue}
        placeholder={placeholder ?? 'Ex : +33 6 12 34 56 78'}
        inputProps={{ required, style: { width: '100%' } }}
        style={{ width: '100%' }}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
