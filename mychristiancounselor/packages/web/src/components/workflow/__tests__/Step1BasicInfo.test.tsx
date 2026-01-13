import { render, screen, fireEvent } from '@testing-library/react';
import { Step1BasicInfo } from '../Step1BasicInfo';

describe('Step1BasicInfo', () => {
  it('renders name and description fields', () => {
    render(
      <Step1BasicInfo
        name=""
        description=""
        isActive={true}
        onNameChange={() => {}}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/Workflow Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('calls onNameChange when name is updated', () => {
    const handleNameChange = jest.fn();
    render(
      <Step1BasicInfo
        name=""
        description=""
        isActive={true}
        onNameChange={handleNameChange}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
      />
    );

    const nameInput = screen.getByLabelText(/Workflow Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    expect(handleNameChange).toHaveBeenCalledWith('Test Workflow');
  });

  it('displays character count for name', () => {
    render(
      <Step1BasicInfo
        name="Test"
        description=""
        isActive={true}
        onNameChange={() => {}}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
      />
    );

    expect(screen.getByText('4/100 characters')).toBeInTheDocument();
  });

  it('displays validation errors', () => {
    render(
      <Step1BasicInfo
        name=""
        description=""
        isActive={true}
        onNameChange={() => {}}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
        errors={{ name: 'Name is required' }}
      />
    );

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });
});
