import { ButtonHTMLAttributes } from 'react';

import styled from 'styled-components';

const Button: React.FC<ButtonHTMLAttributes<HTMLButtonElement>> = styled.button`
  align-self: stretch;
  width: 100px;
  color: #fff;
  background-color: #eb9932;
  &:hover {
     background-color: #B45309;
   }
`;

export default Button;
