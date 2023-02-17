import styled from 'styled-components';
import BREAKPOINTS from '../constants/breakpoints';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  padding: 2rem 4rem;
  z-index: 1;
  @media (max-width: ${BREAKPOINTS.mobile}){
    padding-left: 1rem;
    padding-right: 1rem;
  }
  @media print {
    padding-left: 1rem;
    padding-right: 1rem;
  }
`

const BorderedWrapper = styled(Wrapper)`
  background-color: ${(props) => props.theme.colors.bgColor};
  border: ${(props) => props.theme.colors.border};
  transition: background-color, color 250ms ease;
  @media print {
    border: 0;
  }
`


export { Wrapper, BorderedWrapper }