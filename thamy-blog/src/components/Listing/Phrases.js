import * as React from 'react';
import styled from 'styled-components';

import BREAKPOINTS from '../../constants/breakpoints';

import { TitleH3 } from '../Paragraphs/PageTitle';


const Container = styled.div`
  max-width: 40vw;
  margin: 3rem auto;
  padding: 3rem 2.5rem;
  background-color: ${(props) => props.theme.colors.preCodeBg};
  @media (max-width: ${BREAKPOINTS.tablet}){
    max-width: 100%;
  }
  
`

const Title = styled(TitleH3)`
  margin-left: -4rem;
  padding: 0 8px;
  background-color: ${(props) => props.theme.colors.emphaticPProject};
  color: ${(props) => props.theme.colors.emphaticPProjectColor};
  @media (max-width: ${BREAKPOINTS.tablet}){
    margin-left: 0;
  }
`

const Translate = styled.p`
  margin-bottom: 0.5rem;
`

const Description = styled.p`
  color: ${(props) => props.theme.colors.preCodeColor};
  font-size: .75rem;
  @media (max-width: ${BREAKPOINTS.tablet}){
    font-size: inherit;
  }
`

const Phrases = ({ dataPhrases, className }) => {

    const [phrase, setPhrase] = React.useState({});

    const clamp = (val, min = 0, max = 1) => {
      return Math.max(min, Math.min(max, val));
    };
    
    const initPhrase = React.useCallback(() => {
      let newIndex = clamp(Math.ceil(Math.random() * (dataPhrases.length - 1)),0,(dataPhrases.length - 1));
      setPhrase(dataPhrases[newIndex].node || {});
    },[dataPhrases]);


    React.useEffect(() => {
      initPhrase();
    }, [initPhrase]);

    return (
        <Container className={className}>
            <Title className='--title'>{phrase.phrase}</Title>
            <Translate className='--translate'>{phrase.translate}</Translate>
            <Description className='--desc'>{phrase.description}</Description>
        </Container>
    )
}

export default Phrases;
