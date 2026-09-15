// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => { localStorage.clear() })

describe('Gridate UI', () => {
  it('switches language and opens settings', () => {
    render(<App />)
    expect(screen.getByText('Visual Activity Timeline Planner')).toBeTruthy()
    fireEvent.click(screen.getByText('RU'))
    expect(screen.getByText('Визуальный планировщик активности')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Настройки'))
    expect(screen.getAllByText('Управление мышью').length).toBeGreaterThan(0)
  })
})
