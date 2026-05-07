import { InputHTMLAttributes } from 'react';

import { IconBaseProps } from 'react-icons';

import { Container, Input } from './styles';

interface CustomInputInterface extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType<IconBaseProps>;
}

const CustomInput: React.FC<CustomInputInterface> = ({
  icon: Icon,
  ...rest
}) => {
  return (
    <Container>
      {Icon && <Icon size={20} color="#fff" />}
      <Input {...rest} />
    </Container>
  );
};

export default CustomInput;
