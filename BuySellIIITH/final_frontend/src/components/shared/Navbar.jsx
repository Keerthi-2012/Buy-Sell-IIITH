import React from 'react'
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '../ui/popover'

import { Button } from '../ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Link, LogOut, User2 } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useSelector } from 'react-redux'


const Navbar = () => {
    const {user} = useSelector((state) => state.auth);
    return (
        <div className='bg-white'>
            <div className='flex items-center justify-between mx-auto max-w-7xl h-16'>
                <div>
                    <h1 className='text-2xl font-bold'>Buy<span className='text-[#6A38C2]'>Sell</span></h1>
                </div>
                <div className='flex items-center gap-5'>
                    <ul className='flex font-medium items-center gap-5'>
                        <li><RouterLink to="/"> Home </RouterLink></li>
                        <li><RouterLink to="/BrowseItems"> Browse </RouterLink></li>
                        <li><RouterLink to="/SellItem"> Sell </RouterLink></li>
                        <li><RouterLink to="/Cart"> Cart </RouterLink></li>
                        <li><RouterLink to="/Orders"> Orders </RouterLink></li>
                    </ul>
                    {
                        !user ? (
                            <div className='items-center flex gap-2'>
                                <RouterLink to="/login"><Button variant="outline">Login</Button></RouterLink>
                                <RouterLink to="/register"><Button className='bg-[#6A38C2] c'>Register</Button></RouterLink>
                            </div>
                        ) : (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className=''>
                                        <Avatar className='cursor-pointer'>
                                            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                        </Avatar>
                                    </div>

                                </PopoverTrigger>
                                <PopoverContent className='w-80'>
                                    <div className=''>
                                        <div className='flex gap-2  space-y-2'>
                                            <Avatar className='cursor-pointer'>
                                                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                            </Avatar>
                                            <div>
                                                <h4 className='font-medium'>Keerthi Seela</h4>
                                                <p className='text-sm text-muted-foreground '>Lorem ipsum dolor sit, amet consectetur </p>

                                            </div>
                                        </div>
                                        <div className='flex flex-col my-2 text-gray-600'>
                                            <div className='flex w-fit items-center gap-2 cursor-pointer'>
                                                <User2 />
                                                <Button variant="link"><RouterLink to="/Profile"> View Profile </RouterLink></Button>
                                            </div>
                                            <div className='flex w-fit items-center gap-2 cursor-pointer'>
                                                <LogOut />
                                                <Button variant="link">Logout</Button>
                                            </div>
                                        </div>

                                    </div>

                                </PopoverContent>
                            </Popover>
                        )
                    }

                </div>
            </div>
        </div>
    )
}

export default Navbar
