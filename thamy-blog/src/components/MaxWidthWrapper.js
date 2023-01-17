import styled from 'styled-components';
import BREAKPOINTS from '../constants/breakpoints';

const MaxWidthWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
  padding: 2rem 4rem;
  z-index: 1;
  @media (max-width: ${BREAKPOINTS.mobile}){
    padding-left: 1rem;
    padding-right: 1rem;
  }
  @media print {
    max-width: none;
    padding-left: 1rem;
    padding-right: 1rem;
  }
`

const MaxWidthBorderedWrapper = styled(MaxWidthWrapper)`
  background-color: ${(props) => props.theme.colors.bgColor};
  border: ${(props) => props.theme.colors.border};
  transition: background-color, color 250ms ease;
  @media print {
    border: 0;
  }
`

export { MaxWidthWrapper, MaxWidthBorderedWrapper }