use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{AccountInfo, next_account_info},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

#[derive(BorshDeserialize, BorshSerialize)]
struct OnChainData {
    count: u32,
}

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let mut iter = accounts.iter();
    let data_account = next_account_info(&mut iter)?;

    // Ensure the account can be modified.
    if !data_account.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }

    // Ensure the account belongs to this program.
    if data_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Deserialize the counter.
    let mut counter = OnChainData::try_from_slice(&data_account.data.borrow())?;

    // Update: 0 -> 1, otherwise double the value.
    if counter.count == 0 {
        counter.count = 1;
    } else {
        counter.count = counter
            .count
            .checked_mul(2)
            .ok_or(ProgramError::ArithmeticOverflow)?;
    }

    // Save the updated counter.
    counter.serialize(&mut &mut data_account.data.borrow_mut()[..])?;

    Ok(())
}
