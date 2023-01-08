import styled from 'styled-components';

const TitleH1 = styled.h1`
  margin-top: 2rem;
  font-family: ${(props) => props.theme.fonts.bigTitle.fontFamily};
  font-size: ${(props) => props.theme.fonts.bigTitle.fontSize};
  font-weight: ${(props) => props.theme.fonts.bigTitle.fontWeight};
  color: ${(props) => props.theme.colors.primary};
  text-shadow: 3px 4px ${(props) => props.theme.colors.extra};
  line-height: 1;
`

const TitleH2 = styled.h2`
  font-family: ${(props) => props.theme.fonts.mediumTitle.fontFamily};
  font-size: ${(props) => props.theme.fonts.mediumTitle.fontSize};
  font-weight: ${(props) => props.theme.fonts.mediumTitle.fontWeight};
  text-shadow: 3px 4px ${(props) => props.theme.colors.extra};
  color: ${(props) => props.theme.colors.primary};
  line-height: 1;
`

export { TitleH1, TitleH2 };
