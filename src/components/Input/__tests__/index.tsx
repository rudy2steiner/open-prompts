import { render } from '@testing-library/react';

import CustomInput from '..';

describe('Input', () => {
  it('should input be rendered', () => {
    const { getByTestId } = render(<CustomInput data-testid="1" />);

    const labelElement = getByTestId('1');

    expect(labelElement).toBeTruthy();
  });
});
