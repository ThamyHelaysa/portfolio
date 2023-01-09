import * as React from 'react';
import styled from 'styled-components';

import BREAKPOINTS from '../../constants/breakpoints';

import Button from './DefaultButton';


const OpenBtn = styled(Button)`
  position: relative;
  margin-left: auto;
  z-index: 9;
  @media (min-width: ${BREAKPOINTS.tablet}){
    display: none;
  }
`

const Icon = styled.span`
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 22px;
    transform: scale(0);

    &.--on-open {
        padding-bottom: 6px;
        transform: ${((props) => props.isOpenNav ? "scale(1)" : "scale(0)")};
    }
    &.--on-close {
        transform: ${((props) => props.isOpenNav ? "scale(0)" : "scale(1)")} rotate(90deg);
    }

`

const OpenNavButton = (props, {isOpenNav}) => {
    return (
        <OpenBtn {...props} type="button" className={isOpenNav ? "--open-nav" : ""}>
            <Icon className='--on-open'>&#x268C;</Icon>
            <Icon className='--on-close'>&#x2715;</Icon>
        </OpenBtn>
    )
}

export default OpenNavButton;
