import * as React from 'react';
import styled from 'styled-components';

import BREAKPOINTS from '../../constants/breakpoints.js';
import FONTS from '../../constants/fonts.js';

import Button from '../Button/DefaultButton.js';

const Container = styled.div`
  position: sticky;
  display: flex;
  flex-wrap: wrap;
  gap: 20px 0;
  left: 100%;
  right: 0;
  bottom: 1rem;
  width: clamp(250px, 30vw, 400px);
  height: auto;
  padding: 1rem;
  background-color: ${(props) => props.theme.colors.quoteBg};
  border: ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.quoteColor};
  font-family: ${FONTS.emphasis.fontFamily};
  opacity: 0;
  visibility: hidden;
  transform: scale(0);
  transition: all 300ms ease 0s;
  z-index: 9;
  &.--open {
    opacity: 1;
    visibility: visible;
    transform: scale(1);
  }
  @media (pointer:coarse), (max-width: ${BREAKPOINTS.tablet}){
    display: none;
  }
  @media print {
    display: none;
  }
`

const ConfirmButton = styled(Button)`
  margin-left: auto;
  width: auto;
  font-weight: bold;
`

const RecruiterBubble = ({children}) => {
  const gotIt = JSON.parse(typeof window !== 'undefined' && window.localStorage.getItem("gotIt")) || false;
  const [initEffect, setInitEffect] = React.useState(false);
  const [close, setClose] = React.useState(gotIt);

  const closeBubble = React.useCallback(() => {
    setInitEffect(false);
    setTimeout(() => {
      setClose(true);
      typeof window !== 'undefined' && window.localStorage.setItem("gotIt",JSON.stringify(true));
    }, 1000);
  }, []);

  React.useEffect(() => {
    setTimeout(() => {
      setInitEffect(true);
    }, 1500);
  }, []);

  return (
    <>
      {!close && <Container className={initEffect && "--open"}>
        <p className='--text'>{children}</p>
        <ConfirmButton onClick={closeBubble}>Got it!</ConfirmButton>
      </Container>}
    </>
  )
}

export default RecruiterBubble;
