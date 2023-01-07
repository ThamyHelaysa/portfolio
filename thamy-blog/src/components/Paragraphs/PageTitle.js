import * as React from 'react';
import styled from 'styled-components';

const TitleH1 = styled.h1`
  margin-top: 2rem;
  font-family: ${(props) => props.theme.fonts.bigTitle.fontFamily};
  font-size: ${(props) => props.theme.fonts.bigTitle.fontSize};
  font-weight: ${(props) => props.theme.fonts.bigTitle.fontWeight};
  color: ${(props) => props.theme.colors.primary};
  line-height: 1;
`

export default TitleH1;
