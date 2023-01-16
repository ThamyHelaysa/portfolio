import styled from 'styled-components';

const TitleH1 = styled.h1`
  display: inline-block;
  background-color: ${(props) => props.theme.colors.darkness};
  color: ${(props) => props.theme.colors.titleColor};
  font-family: ${(props) => props.theme.fonts.bigTitle.fontFamily};
  font-size: ${(props) => props.theme.fonts.bigTitle.fontSize};
  font-weight: ${(props) => props.theme.fonts.bigTitle.fontWeight};
  line-height: 1;
`

const TitleH2 = styled.h2`
  display: inline-block;
  background-color: ${(props) => props.theme.colors.darkness};
  color: ${(props) => props.theme.colors.titleColor};
  font-family: ${(props) => props.theme.fonts.mediumTitle.fontFamily};
  font-size: ${(props) => props.theme.fonts.mediumTitle.fontSize};
  font-weight: ${(props) => props.theme.fonts.mediumTitle.fontWeight};
  line-height: 1;
`

export { TitleH1, TitleH2 };
