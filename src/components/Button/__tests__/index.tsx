import { render, fireEvent } from '@testing-library/react';

import CustomButton from '..';

describe('Button', () => {
  it('should button be rendered and clickable', () => {
    const onClick = jest.fn();

    const { getByTestId } = render(
      <CustomButton data-testid="button" onClick={onClick} />,
    );

    fireEvent.click(getByTestId('button'));

    expect(onClick).toHaveBeenCalled();
  });
});
