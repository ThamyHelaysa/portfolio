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
    transition: all 300ms ease 0s;
    .--open-nav > & {
        &.--open {
            transform: scale(0);
        }
        &.--close {
            transform: scale(1) rotate(90deg);
        }
    }

    &.--open {
        padding-bottom: 6px;
        transform: scale(1);
    }
    &.--close {
        transform: scale(0) rotate(90deg);
    }

`

const OpenNavButton = (props) => {
    return (
        <OpenBtn {...props} type="button" className={props.isOpenNav ? "--open-nav" : ""}>
            <Icon className='--open'>&#x268C;</Icon>
            <Icon className='--close'>&#x2715;</Icon>
        </OpenBtn>
    )
}

export default OpenNavButton;
