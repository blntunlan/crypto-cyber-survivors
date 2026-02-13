import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LanguageContext,
  type LanguageContextType,
} from '../../contexts/LanguageContextDefinition';

const Consumer = () => {
  const ctx = React.useContext(LanguageContext);
  return <div data-testid="ctx">{ctx ? ctx.language : 'undefined'}</div>;
};

describe('LanguageContextDefinition', () => {
  it('uses undefined as default context value', () => {
    render(<Consumer />);
    expect(screen.getByTestId('ctx')).toHaveTextContent('undefined');
  });

  it('provides typed value through provider', () => {
    const value: LanguageContextType = {
      language: 'en',
      setLanguage: () => {},
      t: key => key,
    };
    render(
      <LanguageContext.Provider value={value}>
        <Consumer />
      </LanguageContext.Provider>
    );
    expect(screen.getByTestId('ctx')).toHaveTextContent('en');
  });
});
