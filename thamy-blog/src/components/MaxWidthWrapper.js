import styled from 'styled-components';

const MaxWidthWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1300px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 2rem;
  padding-right: 2rem;
  z-index: 1;
`

const MaxWidthBorderedWrapper = styled(MaxWidthWrapper)`
  background-color: ${(props) => props.theme.colors.bgColor};
  border: ${(props) => props.theme.colors.border};
  transition: background-color, color 250ms ease;
`

export { MaxWidthWrapper, MaxWidthBorderedWrapper }