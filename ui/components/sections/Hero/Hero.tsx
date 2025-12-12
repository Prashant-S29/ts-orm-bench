import React from 'react';
import Link from 'next/link';

// icons
import { ChevronRight } from 'lucide-react';

// components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Hero: React.FC = () => {
  return (
    <div className='container mx-auto  flex justify-center flex-col gap-8 items-center'>
      <div className='flex flex-col gap-1 items-center text-center'>
        <Badge variant='secondary'>Playground coming soon</Badge>
        <h1 className='text-3xl mt-3 font-semibold'>
          Which ORM should I choose?
        </h1>
        <p className='text-muted-foreground max-w-3xl'>
          As a JS/TS developer, you get many choices when it comes to selecting
          an ORM. This is a fully unbiased bench that compare all the TS ORMs on
          various matrices.
        </p>
      </div>
      <div className='flex items-center gap-2'>
        <Button variant='default' disabled size='sm'>
          Playground
          <ChevronRight />
        </Button>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/' target='_blank'>
            How it works?
          </Link>
        </Button>
      </div>
    </div>
  );
};
